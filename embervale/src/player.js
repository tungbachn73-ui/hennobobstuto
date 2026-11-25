import * as THREE from 'three';
import { WATER_LEVEL } from './gen.js';

const EYE = 1.62;

export class Player {
  constructor(camera, sampler, spawn) {
    this.camera = camera;
    this.sampler = sampler;
    this.pos = new THREE.Vector3(spawn.x, spawn.h + 2, spawn.z);
    this.velY = 0;
    this.yaw = spawn.yaw ?? 0;
    this.pitch = 0;
    this.keys = new Set();
    this.fly = false;
    this.grounded = true;
    this.bobPhase = 0;
    this.bobAmt = 0;
    this.landImpulse = 0;
    this.sprinting = false;

    camera.rotation.order = 'YXZ';
    camera.position.copy(this.pos);
  }

  forward(out) {
    out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    return out.normalize();
  }

  update(dt) {
    const k = this.keys;
    let mx = 0;
    let mz = 0;
    if (k.has('KeyW')) mz += 1;
    if (k.has('KeyS')) mz -= 1;
    if (k.has('KeyA')) mx -= 1;
    if (k.has('KeyD')) mx += 1;
    const moving = mx !== 0 || mz !== 0;
    this.sprinting = k.has('ShiftLeft') && moving && !this.fly;

    if (this.fly) {
      this.updateFly(dt, mx, mz);
    } else {
      this.updateWalk(dt, mx, mz, moving);
    }

    this.camera.position.set(
      this.pos.x,
      this.pos.y + EYE + Math.sin(this.bobPhase) * this.bobAmt - this.landImpulse * 0.28,
      this.pos.z
    );
    this.landImpulse = THREE.MathUtils.lerp(this.landImpulse, 0, Math.min(1, dt * 7));
    this.camera.rotation.set(this.pitch, this.yaw, Math.sin(this.bobPhase * 0.5) * this.bobAmt * 0.25);
  }

  updateWalk(dt, mx, mz, moving) {
    const terrainH = this.sampler.height(this.pos.x, this.pos.z);
    const inWater = terrainH < WATER_LEVEL - 0.3;
    const speed = (this.sprinting ? 13.5 : 7.2) * (inWater ? 0.45 : 1);
    if (moving) {
      const len = Math.hypot(mx, mz);
      const f = speed * dt / len;
      this.pos.x += (-Math.sin(this.yaw) * mz + Math.cos(this.yaw) * mx) * f;
      this.pos.z += (-Math.cos(this.yaw) * mz - Math.sin(this.yaw) * mx) * f;
      this.bobPhase += dt * (inWater ? 5 : this.sprinting ? 11 : 7.5);
      this.bobAmt = THREE.MathUtils.lerp(this.bobAmt, 0.045, 0.08);
    } else {
      this.bobPhase += dt * 1.4;
      this.bobAmt = THREE.MathUtils.lerp(this.bobAmt, 0.012, 0.05);
    }

    const prevVelY = this.velY;
    const groundEff = Math.max(terrainH, inWater ? WATER_LEVEL - 1.35 : -Infinity);
    this.velY -= 32 * dt;
    this.pos.y += this.velY * dt;
    if (this.pos.y <= groundEff) {
      if (!this.grounded && prevVelY < -12) {
        this.landImpulse = Math.min(0.85, -prevVelY / 24);
        this.bobPhase = 0;
      }
      this.pos.y = groundEff;
      this.velY = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
  }

  updateFly(dt, mx, mz) {
    const dir = this.forward(new THREE.Vector3());
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const speed = (this.keys.has('ShiftLeft') ? 90 : 34) * dt;
    if (mz) this.pos.addScaledVector(dir, speed * mz);
    if (mx) this.pos.addScaledVector(right, speed * mx);
    if (this.keys.has('Space')) this.pos.y += speed * 0.8;
    if (this.keys.has('KeyC') || this.keys.has('ControlLeft')) this.pos.y -= speed * 0.8;
    if (this.pos.y < this.sampler.height(this.pos.x, this.pos.z)) {
      this.pos.y = this.sampler.height(this.pos.x, this.pos.z);
    }
  }

  jump() {
    if (this.grounded && !this.fly) {
      this.velY = 10.5;
      this.grounded = false;
    }
  }

  toggleFly() {
    this.fly = !this.fly;
    if (!this.fly) this.velY = 0;
    return this.fly;
  }
}

export function findSpawn(sampler) {
  for (let r = 0; r < 60; r++) {
    for (let a = 0; a < 20; a++) {
      const ang = (a / 20) * Math.PI * 2;
      const x = Math.round(Math.cos(ang) * r * 14);
      const z = Math.round(Math.sin(ang) * r * 14);
      const h = sampler.height(x, z);
      if (h > 2.5 && h < 14) {
        const sx = sampler.height(x + 3, z) - sampler.height(x - 3, z);
        const sz = sampler.height(x, z + 3) - sampler.height(x, z - 3);
        if (Math.hypot(sx, sz) / 6 < 0.4) {
          return { x, z, h, yaw: ang + Math.PI };
        }
      }
    }
  }
  return { x: 0, z: 0, h: sampler.height(0, 0), yaw: 0 };
}
