import * as THREE from 'three';

const GOLDEN_T = 0.028;

const STOPS = [
  {
    y: -1.0,
    zenith: 0x060a16, horizon: 0x0d1322, fog: 0x0a101b,
    sun: 0x93a8d4, lightI: 0.0, hemiSky: 0x0d1526, hemiGround: 0x0a0d11,
    waterDeep: 0x081019, cloud: 0x4a5468, cloudO: 0.22
  },
  {
    y: -0.1,
    zenith: 0x131c34, horizon: 0x513a4c, fog: 0x2a2233,
    sun: 0xff9a6b, lightI: 0.15, hemiSky: 0x2a3350, hemiGround: 0x201a20,
    waterDeep: 0x0d1722, cloud: 0x8a6a77, cloudO: 0.3
  },
  {
    y: 0.0,
    zenith: 0x2c4470, horizon: 0xff9c56, fog: 0xe9a870,
    sun: 0xffc46b, lightI: 1.9, hemiSky: 0x7a86a8, hemiGround: 0x5f4a34,
    waterDeep: 0x123039, cloud: 0xffc49a, cloudO: 0.42
  },
  {
    y: 0.15,
    zenith: 0x4a79b8, horizon: 0xffc98f, fog: 0xefc491,
    sun: 0xffd9a0, lightI: 2.5, hemiSky: 0x8fa3c4, hemiGround: 0x6b5a3e,
    waterDeep: 0x144047, cloud: 0xfff0d8, cloudO: 0.45
  },
  {
    y: 0.55,
    zenith: 0x5c93d4, horizon: 0xd8e5ef, fog: 0xd2dfe9,
    sun: 0xfff4dd, lightI: 3.0, hemiSky: 0x9db8d6, hemiGround: 0x77684a,
    waterDeep: 0x16505a, cloud: 0xffffff, cloudO: 0.5
  }
];

function paletteKey(sunY) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (sunY <= STOPS[i + 1].y) return [STOPS[i], STOPS[i + 1]];
  }
  return [STOPS[STOPS.length - 2], STOPS[STOPS.length - 1]];
}

function lerpStops(a, b, t, out) {
  for (const k of ['zenith', 'horizon', 'fog', 'sun', 'hemiSky', 'hemiGround', 'waterDeep', 'cloud']) {
    out[k] = out[k] || new THREE.Color();
    out[k].set(a[k]).lerp(b[k], t);
  }
  out.lightI = a.lightI + (b.lightI - a.lightI) * t;
  out.cloudO = a.cloudO + (b.cloudO - a.cloudO) * t;
  return out;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 30 + Math.random() * 196;
    const y = 40 + Math.random() * 55;
    const r = 18 + Math.random() * 38;
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const SKY_FRAG = `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uNight;
uniform float uTime;
varying vec3 vDir;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.15, 1.0);
  vec3 sky = mix(uHorizon, uZenith, pow(clamp(h * 1.2, 0.0, 1.0), 0.6));
  float sunAmt = max(dot(d, normalize(uSunDir)), 0.0);
  sky += uSunColor * (pow(sunAmt, 400.0) * 1.6 + pow(sunAmt, 28.0) * 0.25 + pow(sunAmt, 3.0) * 0.1);
  if (uNight > 0.01) {
    float star = hash(floor(d * 240.0));
    float tw = 0.6 + 0.4 * sin(uTime * 2.0 + star * 60.0);
    sky += vec3(0.85, 0.9, 1.0) * step(0.9976, star) * tw * uNight * smoothstep(-0.05, 0.15, d.y);
  }
  gl_FragColor = vec4(sky, 1.0);
}
`;

const WATER_VERT = `
#include <fog_pars_vertex>
uniform float uTime;
varying vec3 vWorldPos;
varying vec3 vWaveNormal;
varying vec2 vXZ;

float waveH(vec2 p) {
  return sin(p.x * 0.14 + uTime * 1.1) * 0.22
       + sin((p.x + p.y) * 0.095 - uTime * 0.7) * 0.30
       + sin(p.y * 0.19 + uTime * 1.5) * 0.13;
}

void main() {
  vec3 p = position;
  vec4 wp0 = modelMatrix * vec4(p, 1.0);
  vec2 xz = wp0.xz;
  vXZ = xz;
  float h = waveH(xz);
  p.z += h;
  float e = 1.5;
  float hx = waveH(xz + vec2(e, 0.0));
  float hz = waveH(xz + vec2(0.0, e));
  vWaveNormal = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const WATER_FRAG = `
#include <fog_pars_fragment>
uniform vec3 uDeep;
uniform vec3 uSky;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uNight;
varying vec3 vWorldPos;
varying vec3 vWaveNormal;
varying vec2 vXZ;

void main() {
  vec3 n = normalize(vWaveNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
  vec3 col = mix(uDeep, uSky, 0.2 + fres * 0.75);
  vec3 refl = reflect(-normalize(viewDir - uSunDir * 0.25), n);
  float spec = pow(max(dot(refl, viewDir), 0.0), 240.0);
  col += uSunColor * spec * 2.4;
  col *= 1.0 - uNight * 0.75;
  float sparkle = pow(max(dot(refl, viewDir), 0.0), 60.0) * 0.25;
  col += uSunColor * sparkle;
  gl_FragColor = vec4(col, 0.9);
  #include <fog_fragment>
}
`;

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = GOLDEN_T;
    this.timeFlow = false;

    scene.fog = new THREE.FogExp2(0xe9a870, 0.0024);

    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.sun = new THREE.DirectionalLight(0xffd9a8, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -95;
    sc.right = 95;
    sc.top = 95;
    sc.bottom = -95;
    sc.near = 5;
    sc.far = 700;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 2.2;
    scene.add(this.sun);
    this.sun.target.position.set(0, 0, 0);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x8fa3c4, 0x6b5a3e, 0.6);
    scene.add(this.hemi);

    this.skyUniforms = {
      uZenith: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3() },
      uNight: { value: 0 },
      uTime: { value: 0 }
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 20), skyMat);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -10;
    scene.add(this.skyMesh);

    this.waterUniforms = THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uDeep: { value: new THREE.Color() },
        uSky: { value: new THREE.Color() },
        uSunColor: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3() },
        uNight: { value: 0 }
      }
    ]);
    const waterMat = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      fog: true
    });
    this.waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600, 96, 96), waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.frustumCulled = false;
    scene.add(this.waterMesh);

    this.cloudMat = new THREE.SpriteMaterial({
      map: makeCloudTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.45
    });
    this.cloudGroup = new THREE.Group();
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const ang = Math.random() * Math.PI * 2;
      const dist = 220 + Math.random() * 500;
      s.position.set(Math.cos(ang) * dist, 230 + Math.random() * 190, Math.sin(ang) * dist);
      s.scale.set(180 + Math.random() * 220, 70 + Math.random() * 80, 1);
      s.material.rotation = Math.random() * 0.25;
      this.cloudGroup.add(s);
      this.clouds.push({ sprite: s, baseX: s.position.x, baseZ: s.position.z, phase: Math.random() * 10 });
    }
    scene.add(this.cloudGroup);

    this._pal = { zenith: new THREE.Color(), horizon: new THREE.Color(), fog: new THREE.Color(), sun: new THREE.Color(), hemiSky: new THREE.Color(), hemiGround: new THREE.Color(), waterDeep: new THREE.Color(), cloud: new THREE.Color(), lightI: 2, cloudO: 0.4 };
    this._tmpA = new THREE.Color();
  }

  update(dt, t, playerPos, camera) {
    if (this.timeFlow) this.timeOfDay = (this.timeOfDay + dt * 0.0022) % 1;

    const angle = this.timeOfDay * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunXZ = Math.sqrt(Math.max(0, 1 - sunY * sunY));
    const az = 0.85;
    this.sunDir.set(sunXZ * Math.cos(az) + 0.18, sunY, sunXZ * Math.sin(az)).normalize();

    const [a, b] = paletteKey(sunY);
    const k = (sunY - a.y) / (b.y - a.y);
    lerpStops(a, b, THREE.MathUtils.clamp(k, 0, 1), this._pal);

    const dayF = THREE.MathUtils.smoothstep(sunY, -0.03, 0.14);
    const nightF = 1 - THREE.MathUtils.smoothstep(sunY, -0.14, -0.02);

    this.sun.color.set(this._pal.sun);
    this.sun.intensity = this._pal.lightI * dayF + 0.14 * (1 - dayF);
    this.sun.castShadow = sunY > -0.02;
    this.sun.position.copy(playerPos).addScaledVector(this.sunDir, 280);
    this.sun.target.position.copy(playerPos);

    this.hemi.color.set(this._pal.hemiSky);
    this.hemi.groundColor.set(this._pal.hemiGround);
    this.hemi.intensity = 0.25 + dayF * 0.45;

    this.scene.fog.color.set(this._pal.fog);
    this.scene.fog.density = 0.0024 + (1 - dayF) * 0.0018;

    this.skyUniforms.uZenith.value.copy(this._pal.zenith);
    this.skyUniforms.uHorizon.value.copy(this._pal.horizon);
    this.skyUniforms.uSunColor.value.copy(this._pal.sun);
    this.skyUniforms.uSunDir.value.copy(this.sunDir);
    this.skyUniforms.uNight.value = nightF;
    this.skyUniforms.uTime.value = t;
    this.skyMesh.position.copy(camera.position);

    this.waterUniforms.uTime.value = t;
    this.waterUniforms.uDeep.value.copy(this._pal.waterDeep);
    this.waterUniforms.uSky.value.copy(this._pal.horizon);
    this.waterUniforms.uSunColor.value.copy(this._pal.sun);
    this.waterUniforms.uSunDir.value.copy(this.sunDir);
    this.waterUniforms.uNight.value = nightF;
    this.waterMesh.position.set(
      Math.round(camera.position.x / 24) * 24,
      0,
      Math.round(camera.position.z / 24) * 24
    );

    this.cloudGroup.position.x = camera.position.x;
    this.cloudGroup.position.z = camera.position.z;
    for (const c of this.clouds) {
      c.sprite.position.x = c.baseX + Math.sin(t * 0.01 + c.phase) * 60;
      c.sprite.position.z = c.baseZ + Math.cos(t * 0.008 + c.phase) * 40;
    }
    this.cloudMat.opacity = this._pal.cloudO;
    this.cloudMat.color.copy(this._pal.cloud);
  }
}
