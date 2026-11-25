import * as THREE from 'three';
import { createSampler, WATER_LEVEL, colorAt } from './gen.js';
import { makeRng, hash2 } from './rng.js';

export const CHUNK_SIZE = 96;
export const SEGMENTS = 64;
export const RETENTION_MS = 15000;

const VERTS = SEGMENTS + 1;
const MARGIN = SEGMENTS + 3;
const CELL = CHUNK_SIZE / SEGMENTS;
const CACHE_MAX = 640;

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _eul = new THREE.Euler();
const _col = new THREE.Color();

export const windUniform = { value: 0 };

function applyWind(material, strength, heightFalloff) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windUniform;
    shader.vertexShader =
      'uniform float uWindTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float wPhase = instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.35;
          float wSway = sin(uWindTime * 1.5 + wPhase) * ${strength} * ${heightFalloff ? 'max(position.y, 0.0)' : '1.0'};
          transformed.x += wSway;
          transformed.z += wSway * 0.55;
        #endif
        `
      );
  };
}

export class ChunkManager {
  constructor(scene, seed, sky) {
    this.scene = scene;
    this.seed = seed;
    this.sky = sky;
    this.sampler = createSampler(seed);
    this.radius = 6;
    this.chunks = new Map();
    this.queue = [];
    this.edits = new Map();
    this.caches = new Map();
    this.activeCount = 0;
    this.cachedCount = 0;
    this.restoredCount = 0;
    this.deletedCount = 0;
    this.onRestore = null;
    this._frustum = new THREE.Frustum();
    this._projScreen = new THREE.Matrix4();
    this._lastKey = null;

    this.sphere = new THREE.Sphere();

    this.geoTrunk = new THREE.CylinderGeometry(0.16, 0.34, 2.8, 5);
    this.geoTrunk.translate(0, 1.4, 0);
    this.geoRound = new THREE.IcosahedronGeometry(1.7, 1);
    this.geoRound.translate(0, 3.2, 0);
    this.geoPine = new THREE.ConeGeometry(1.5, 4.4, 8);
    this.geoPine.translate(0, 2.2, 0);
    this.geoRock = new THREE.DodecahedronGeometry(1, 0);
    this.geoGrass = new THREE.ConeGeometry(0.085, 1.1, 4);
    this.geoGrass.translate(0, 0.55, 0);

    this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x5e4630, roughness: 0.95 });
    this.matRound = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    this.matPine = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    this.matRock = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    this.matGrass = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    applyWind(this.matRound, 0.05, false);
    applyWind(this.matPine, 0.025, false);
    applyWind(this.matGrass, 0.14, true);

    this.texFlame = makeFlameTexture();
    this.texSmoke = makeSmokeTexture();

    this.terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  }

  key(cx, cz) {
    return cx + ',' + cz;
  }

  heightAt(x, z) {
    return this.sampler.height(x, z);
  }

  sampleField(cx, cz) {
    const tNow = performance.now();
    const cached = this.caches.get(this.key(cx, cz));
    if (cached) {
      cached.t = tNow;
      cached.wasCached = true;
      return cached;
    }
    const heights = new Float32Array(MARGIN * MARGIN);
    const moist = new Float32Array(VERTS * VERTS);
    const ox = cx * CHUNK_SIZE - CHUNK_SIZE / 2 - CELL;
    const oz = cz * CHUNK_SIZE - CHUNK_SIZE / 2 - CELL;
    for (let j = 0; j < MARGIN; j++) {
      const z = oz + j * CELL;
      for (let i = 0; i < MARGIN; i++) {
        heights[j * MARGIN + i] = this.sampler.height(ox + i * CELL, z);
      }
    }
    for (let j = 0; j < VERTS; j++) {
      const z = cz * CHUNK_SIZE - CHUNK_SIZE / 2 + j * CELL;
      for (let i = 0; i < VERTS; i++) {
        moist[j * VERTS + i] = this.sampler.moisture(cx * CHUNK_SIZE - CHUNK_SIZE / 2 + i * CELL, z);
      }
    }
    const data = { heights, moist, t: tNow, wasCached: false };
    this.caches.set(this.key(cx, cz), data);
    this.cachedCount = this.caches.size;
    return data;
  }

  buildChunk(cx, cz) {
    const key = this.key(cx, cz);
    if (this.chunks.has(key)) return;
    const data = this.sampleField(cx, cz);
    const group = new THREE.Group();
    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;
    group.position.set(originX, 0, originZ);

    const terrain = this.buildTerrain(cx, cz, data);
    group.add(terrain);

    const fires = [];
    const edits = this.edits.get(key);
    if (edits) {
      for (const e of edits) fires.push(this.buildCampfire(e.x, e.y, e.z));
      for (const f of fires) group.add(f.group);
    }

    this.buildScatter(group, cx, cz);

    this.scene.add(group);
    const sphere = new THREE.Sphere();
    new THREE.Box3().setFromObject(group).getBoundingSphere(sphere);
    const chunk = {
      cx,
      cz,
      key,
      group,
      sphere,
      data,
      fires,
      lastSeen: performance.now()
    };
    this.chunks.set(key, chunk);

    if (data.wasCached && this.onRestore) {
      data.wasCached = false;
      this.restoredCount++;
      this.onRestore(chunk);
    }
    this.activeCount = this.chunks.size;
  }

  buildTerrain(cx, cz, data) {
    const geo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, SEGMENTS, SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;

    for (let v = 0; v < pos.count; v++) {
      const lx = pos.getX(v);
      const lz = pos.getZ(v);
      const i = Math.round((lx + CHUNK_SIZE / 2) / CELL);
      const j = Math.round((lz + CHUNK_SIZE / 2) / CELL);
      const g = (j + 1) * MARGIN + (i + 1);
      const h = data.heights[g];
      pos.setY(v, h);

      const hL = data.heights[g - 1];
      const hR = data.heights[g + 1];
      const hU = data.heights[g - MARGIN];
      const hD = data.heights[g + MARGIN];
      const dhx = (hR - hL) / (2 * CELL);
      const dhz = (hD - hU) / (2 * CELL);
      const slope = Math.hypot(dhx, dhz);
      const m = data.moist[j * VERTS + i];

      const c = colorAt(h, slope, m);
      const jit = 0.955 + ((hash2(this.seed, (originX + lx) | 0, (originZ + lz) | 0) & 255) / 255) * 0.07;
      colors[v * 3] = c[0] * jit;
      colors[v * 3 + 1] = c[1] * jit;
      colors[v * 3 + 2] = c[2] * jit;

      const nx = -dhx;
      const nz = -dhz;
      const len = Math.hypot(nx, 1, nz);
      geo.attributes.normal.setXYZ(v, nx / len, 1 / len, nz / len);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeBoundingSphere();

    const mesh = new THREE.Mesh(geo, this.terrainMat);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    return mesh;
  }

  buildScatter(group, cx, cz) {
    const rng = makeRng(hash2(this.seed, cx, cz));
    const originX = cx * CHUNK_SIZE;
    const originZ = cz * CHUNK_SIZE;

    const trunks = [];
    const rounds = [];
    const pines = [];
    const rocks = [];
    const grass = [];

    for (let gz = 0; gz < 8; gz++) {
      for (let gx = 0; gx < 8; gx++) {
        if (rng() > 0.62) continue;
        const x = originX - CHUNK_SIZE / 2 + (gx + 0.15 + rng() * 0.7) * (CHUNK_SIZE / 8);
        const z = originZ - CHUNK_SIZE / 2 + (gz + 0.15 + rng() * 0.7) * (CHUNK_SIZE / 8);
        const h = this.sampler.height(x, z);
        if (h < WATER_LEVEL + 1.6 || h > 40) continue;
        const slope = this.slopeAt(x, z);
        if (slope > 0.85) continue;
        const m = this.sampler.moisture(x, z);
        if (m < 0.32) continue;
        const y = h - 0.15;
        const s = 0.75 + rng() * 0.75;
        const rot = rng() * Math.PI * 2;
        const pine = h > 20 || m > 0.62;
        trunks.push({ x: x - originX, y, z: z - originZ, s, rot });
        const tint = pine
          ? [0.16 + rng() * 0.1, 0.34 + rng() * 0.12, 0.16 + rng() * 0.06]
          : [0.28 + rng() * 0.14, 0.42 + rng() * 0.1, 0.15 + rng() * 0.08];
        (pine ? pines : rounds).push({ x: x - originX, y, z: z - originZ, s, rot, tint });
      }
    }

    for (let k = 0; k < 12; k++) {
      const x = originX - CHUNK_SIZE / 2 + rng() * CHUNK_SIZE;
      const z = originZ - CHUNK_SIZE / 2 + rng() * CHUNK_SIZE;
      const h = this.sampler.height(x, z);
      if (h < WATER_LEVEL + 0.4) continue;
      if (rng() > 0.35 + this.slopeAt(x, z)) continue;
      rocks.push({
        x: x - originX,
        y: h - 0.3,
        z: z - originZ,
        sx: 0.4 + rng() * 1.5,
        sy: 0.3 + rng() * 0.9,
        sz: 0.4 + rng() * 1.5,
        rot: rng() * Math.PI * 2
      });
    }

    for (let k = 0; k < 240; k++) {
      const x = originX - CHUNK_SIZE / 2 + rng() * CHUNK_SIZE;
      const z = originZ - CHUNK_SIZE / 2 + rng() * CHUNK_SIZE;
      const h = this.sampler.height(x, z);
      if (h < WATER_LEVEL + 1 || h > 42) continue;
      if (this.slopeAt(x, z) > 0.8) continue;
      const m = this.sampler.moisture(x, z);
      if (m < 0.24) continue;
      grass.push({
        x: x - originX,
        y: h - 0.05,
        z: z - originZ,
        s: 0.6 + rng() * 0.9,
        rot: rng() * Math.PI,
        tint: 0.45 + m * 0.5 + rng() * 0.1
      });
    }

    this.fillInstanced(group, this.geoTrunk, this.matTrunk, trunks, true, (o) => {
      _pos.set(o.x, o.y, o.z);
      _quat.setFromEuler(_eul.set(0, o.rot, 0));
      _scl.set(o.s, o.s * (0.8 + o.s * 0.25), o.s);
      return _mat.compose(_pos, _quat, _scl);
    });

    this.fillInstanced(group, this.geoRound, this.matRound, rounds, true, (o) => {
      _pos.set(o.x, o.y, o.z);
      _quat.setFromEuler(_eul.set((o.x % 0.2) - 0.1, o.rot, (o.z % 0.2) - 0.1));
      _scl.setScalar(o.s);
      return _mat.compose(_pos, _quat, _scl);
    }, (mesh) => {
      for (let i = 0; i < rounds.length; i++) {
        const t = rounds[i].tint;
        mesh.setColorAt(i, _col.setRGB(t[0], t[1], t[2], THREE.SRGBColorSpace));
      }
    });

    this.fillInstanced(group, this.geoPine, this.matPine, pines, true, (o) => {
      _pos.set(o.x, o.y, o.z);
      _quat.setFromEuler(_eul.set(0, o.rot, 0));
      _scl.setScalar(o.s);
      return _mat.compose(_pos, _quat, _scl);
    }, (mesh) => {
      for (let i = 0; i < pines.length; i++) {
        const t = pines[i].tint;
        mesh.setColorAt(i, _col.setRGB(t[0], t[1], t[2], THREE.SRGBColorSpace));
      }
    });

    this.fillInstanced(group, this.geoRock, this.matRock, rocks, true, (o) => {
      _pos.set(o.x, o.y, o.z);
      _quat.setFromEuler(_eul.set(o.rot * 0.3, o.rot, o.rot * 0.2));
      _scl.set(o.sx, o.sy, o.sz);
      const shade = 0.75 + ((hash2(this.seed, (o.x + originX) | 0, (o.z + originZ) | 0) & 63) / 63) * 0.25;
      _col.setRGB(0.55 * shade, 0.53 * shade, 0.5 * shade, THREE.SRGBColorSpace);
      return _mat.compose(_pos, _quat, _scl);
    }, (mesh) => {
      for (let i = 0; i < rocks.length; i++) {
        const shade = 0.75 + ((hash2(this.seed, (rocks[i].x + originX) | 0, (rocks[i].z + originZ) | 0) & 63) / 63) * 0.25;
        mesh.setColorAt(i, _col.setRGB(0.55 * shade, 0.53 * shade, 0.5 * shade, THREE.SRGBColorSpace));
      }
    });

    this.fillInstanced(group, this.geoGrass, this.matGrass, grass, false, (o) => {
      _pos.set(o.x, o.y, o.z);
      _quat.setFromEuler(_eul.set(0, o.rot, 0));
      _scl.setScalar(o.s);
      return _mat.compose(_pos, _quat, _scl);
    }, (mesh) => {
      for (let i = 0; i < grass.length; i++) {
        const g = grass[i].tint;
        _col.setRGB(0.3 + g * 0.25, 0.34 + g * 0.25, 0.14 + g * 0.25, THREE.SRGBColorSpace);
        mesh.setColorAt(i, _col);
      }
    });
  }

  fillInstanced(group, geo, mat, items, shadow, matrixOf, colorize) {
    if (!items.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.frustumCulled = false;
    for (let i = 0; i < items.length; i++) {
      mesh.setMatrixAt(i, matrixOf(items[i]));
    }
    if (colorize) colorize(mesh);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadow;
    mesh.receiveShadow = shadow;
    group.add(mesh);
  }

  slopeAt(x, z) {
    const e = 2;
    const hL = this.sampler.height(x - e, z);
    const hR = this.sampler.height(x + e, z);
    const hU = this.sampler.height(x, z - e);
    const hD = this.sampler.height(x, z + e);
    return Math.hypot(hR - hL, hD - hU) / (2 * e);
  }

  evictCache() {
    if (this.caches.size <= CACHE_MAX) return;
    const entries = [...this.caches.entries()];
    entries.sort((a, b) => a[1].t - b[1].t);
    let excess = this.caches.size - CACHE_MAX;
    for (const [k] of entries) {
      if (excess <= 0) break;
      if (!this.chunks.has(k)) {
        this.caches.delete(k);
        excess--;
      }
    }
    this.cachedCount = this.caches.size;
  }

  unloadChunk(chunk) {
    chunk.group.traverse((o) => {
      if (o.isMesh) {
        if (o.isInstancedMesh) o.dispose();
        else if (o.geometry !== this.geoTrunk && o.geometry !== this.geoPine) {
          if (o.geometry !== this.geoRound && o.geometry !== this.geoRock && o.geometry !== this.geoGrass) {
            o.geometry.dispose();
          }
        }
      }
      if (o.isSprite) {
        o.material.dispose();
      }
    });
    for (const f of chunk.fires) {
      if (f.lightPooled) f.light.visible = false;
    }
    this.scene.remove(chunk.group);
    this.chunks.delete(chunk.key);
    this.deletedCount++;
    this.activeCount = this.chunks.size;
  }

  update(camera, playerPos) {
    const now = performance.now();
    const pcx = Math.floor(playerPos.x / CHUNK_SIZE + 0.5);
    const pcz = Math.floor(playerPos.z / CHUNK_SIZE + 0.5);

    this._projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._projScreen);

    const visibleSet = new Set();
    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        if (dx * dx + dz * dz > this.radius * this.radius) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.key(cx, cz);
        visibleSet.add(key);
        const chunk = this.chunks.get(key);
        if (chunk) {
          if (this._frustum.intersectsSphere(chunk.sphere) || dx * dx + dz * dz <= 4) {
            chunk.lastSeen = now;
          }
        } else if (!this.queue.includes(key)) {
          this.queue.push(key);
        }
      }
    }

    for (let i = this.queue.length - 1; i >= 0; i--) {
      if (!visibleSet.has(this.queue[i])) this.queue.splice(i, 1);
    }
    this.queue.sort((a, b) => {
      const [ax, az] = a.split(',').map(Number);
      const [bx, bz] = b.split(',').map(Number);
      const da = (ax - pcx) * (ax - pcx) + (az - pcz) * (az - pcz);
      const db = (bx - pcx) * (bx - pcx) + (bz - pcz) * (bz - pcz);
      return da - db;
    });

    const budgetStart = performance.now();
    while (this.queue.length && performance.now() - budgetStart < 7) {
      const key = this.queue.shift();
      if (this.chunks.has(key)) continue;
      const [cx, cz] = key.split(',').map(Number);
      this.buildChunk(cx, cz);
    }

    for (const chunk of [...this.chunks.values()]) {
      if (now - chunk.lastSeen > RETENTION_MS) {
        this.unloadChunk(chunk);
      }
    }

    this.evictCache();
  }

  serializeEdits() {
    const out = [];
    for (const [key, list] of this.edits) {
      if (list.length) out.push([key, list.map((e) => ({ x: e.x, y: e.y, z: e.z }))]);
    }
    return out;
  }

  loadEdits(arr) {
    if (!arr) return;
    for (const [key, list] of arr) {
      this.edits.set(key, list);
    }
  }

  addCampfire(x, y, z) {
    const cx = Math.floor(x / CHUNK_SIZE + 0.5);
    const cz = Math.floor(z / CHUNK_SIZE + 0.5);
    const key = this.key(cx, cz);
    let list = this.edits.get(key);
    if (!list) {
      list = [];
      this.edits.set(key, list);
    }
    list.push({ x, y, z });
    const chunk = this.chunks.get(key);
    if (chunk) {
      const fire = this.buildCampfire(x, y, z);
      chunk.fires.push(fire);
      chunk.group.add(fire.group);
      return fire;
    }
    return null;
  }

  buildCampfire(x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const logGeo = new THREE.CylinderGeometry(0.09, 0.12, 1.1, 5);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1c, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(logGeo, logMat);
      log.position.y = 0.18;
      log.rotation.z = Math.PI / 2 - 0.35;
      log.rotation.y = (i / 4) * Math.PI * 2;
      log.position.x = Math.cos((i / 4) * Math.PI * 2) * 0.25;
      log.position.z = Math.sin((i / 4) * Math.PI * 2) * 0.25;
      log.castShadow = true;
      group.add(log);
    }

    const flameMat = new THREE.SpriteMaterial({
      map: this.texFlame,
      color: 0xffb347,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const flame = new THREE.Sprite(flameMat);
    flame.position.y = 0.75;
    flame.scale.setScalar(1.4);
    group.add(flame);

    const smokeSprites = [];
    for (let i = 0; i < 5; i++) {
      const sm = new THREE.SpriteMaterial({
        map: this.texSmoke,
        color: 0xb9b2a6,
        transparent: true,
        depthWrite: false,
        opacity: 0
      });
      const sprite = new THREE.Sprite(sm);
      sprite.position.y = 2;
      sprite.scale.setScalar(1.5);
      group.add(sprite);
      smokeSprites.push({ sprite, phase: i / 5 });
    }

    return {
      group,
      pos: new THREE.Vector3(x, y + 1.0, z),
      flame,
      smokeSprites,
      created: makeRng(hash2(this.seed, (x * 100) | 0, (z * 100) | 0))()
    };
  }

  updateEffects(t, lightPool) {
    const near = [];
    for (const chunk of this.chunks.values()) {
      for (const f of chunk.fires) {
        if (f.pos.distanceToSquared(lightPool.center) < 4900) near.push(f);
        const flick = 0.82 + 0.18 * Math.sin(t * 21 + f.created * 40) + 0.08 * Math.sin(t * 47 + f.created * 91);
        f.flame.material.opacity = 0.85;
        f.flame.scale.setScalar(1.25 + flick * 0.35);
        for (const s of f.smokeSprites) {
          const p = (t * 0.25 + s.phase) % 1;
          s.sprite.position.y = 1.4 + p * 6;
          s.sprite.position.x = Math.sin(t * 0.6 + s.phase * 9) * p * 1.6;
          s.sprite.position.z = Math.cos(t * 0.5 + s.phase * 7) * p * 1.2;
          s.sprite.material.opacity = Math.max(0, (1 - p) * 0.4) * Math.min(1, p * 6);
          s.sprite.scale.setScalar(1.2 + p * 2.6);
        }
      }
    }
    near.sort((a, b) => a.pos.distanceToSquared(lightPool.center) - b.pos.distanceToSquared(lightPool.center));
    for (let i = 0; i < lightPool.lights.length; i++) {
      const light = lightPool.lights[i];
      const fire = near[i];
      if (fire) {
        light.visible = true;
        light.position.copy(fire.pos);
        light.intensity = 22 + 7 * Math.sin(t * 19 + fire.created * 30);
      } else {
        light.visible = false;
      }
    }
  }
}

function makeFlameTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 38, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,240,200,1)');
  grad.addColorStop(0.35, 'rgba(255,160,60,0.85)');
  grad.addColorStop(0.7, 'rgba(255,90,20,0.35)');
  grad.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(210,205,195,0.6)');
  grad.addColorStop(1, 'rgba(210,205,195,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
