import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('../dist/embervale.html', import.meta.url), 'utf8');
const m = html.match(/<script type="module">\n([\s\S]*)<\/script>\s*<\/body>/);
if (!m) throw new Error('module script not found in build');
let js = m[1];

const threeCount = (js.match(/^import \* as THREE from 'three';/gm) || []).length;
if (threeCount !== 1) {
  throw new Error(`THREE import must appear exactly once, found ${threeCount} (0 = "THREE is not defined", >1 = duplicate declaration)`);
}
if (!/from 'three\/addons\/postprocessing\//.test(js)) {
  throw new Error('addon imports missing from bundle (would cause: EffectComposer is not defined)');
}

for (const name of ['clamp01', 'smoothstep01', 'createSampler', 'colorAt', 'WATER_LEVEL', 'windUniform']) {
  const defines = new RegExp(`(const|let|var|function) ${name}\\b`);
  if (!defines.test(js)) throw new Error(`symbol ${name} used but never defined after import stripping`);
}

class DomElement {
  constructor(id, classes = []) {
    this.id = id;
    this.style = {};
    this.dataset = {};
    this.textContent = '';
    this.classes = new Set(classes);
    this.handlers = {};
    this.children = [];
    this.bind = () => {};
    this.addEventListener = (t, fn) => {
      (this.handlers[t] = this.handlers[t] || []).push(fn);
    };
    this.appendChild = (c) => this.children.push(c);
  }
  get classList() {
    const s = this.classes;
    return {
      add: (...c) => c.forEach((x) => s.add(x)),
      remove: (...c) => c.forEach((x) => s.delete(x)),
      contains: (c) => s.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !s.has(c) : force;
        if (on) s.add(c); else s.delete(c);
        return on;
      }
    };
  }
}

const els = new Map();
const getEl = (id) => {
  if (!els.has(id)) els.set(id, new DomElement(id, id === 'pause' ? ['hidden'] : []));
  return els.get(id);
};

const gameCanvas = new DomElement('game');
gameCanvas.requestPointerLock = () => Promise.reject(new Error('pointer lock unavailable in test'));

globalThis.document = {
  pointerLockElement: undefined,
  getElementById: getEl,
  createElement: () => ({
    width: 64,
    height: 64,
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect() {}
    })
  }),
  addEventListener: () => {}
};

globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  AudioContext: undefined,
  webkitAudioContext: undefined,
  addEventListener: () => {}
};

globalThis.localStorage = {
  _m: new Map(),
  getItem(k) { return this._m.get(k) ?? null; },
  setItem(k, v) { this._m.set(k, v); },
  removeItem(k) { this._m.delete(k); }
};

globalThis.requestAnimationFrame = () => 0;
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = () => 0;
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};

js = js
  .replace(
    'new THREE.WebGLRenderer({ antialias: true, powerPreference: \'high-performance\' })',
    `{ domElement: globalThis.__gameCanvas, setPixelRatio() {}, setSize() {}, shadowMap: { enabled: false, type: null }, dispose() {} }`
  )
  .replace(
    'new EffectComposer(renderer)',
    `{ addPass() {}, setSize() {}, render() {} }`
  );

globalThis.__gameCanvas = gameCanvas;
if (js.includes('new THREE.WebGLRenderer(')) throw new Error('harness patch failed: WebGLRenderer not stubbed');
if (!js.includes('domElement: globalThis.__gameCanvas')) throw new Error('harness patch failed: stub text missing');
globalThis.document.body = new DomElement('body');

js += '\nglobalThis.__BOOT = { player, world, env, camera, scene, saveGame };\n';
writeFileSync(new URL('../.tmp-bundle.mjs', import.meta.url), js);

await import('../.tmp-bundle.mjs');

const B = globalThis.__BOOT;
if (!B) throw new Error('boot did not run to completion');
if (!Number.isFinite(B.player.pos.x)) throw new Error('player position is NaN');
if (B.world.activeCount < 25) throw new Error(`expected at least 25 prebuilt chunks, got ${B.world.activeCount}`);

const beginHandlers = getEl('btn-begin').handlers.click || [];
beginHandlers.forEach((fn) => fn());
if (!getEl('intro').classList.contains('fade')) throw new Error('begin button did not fade the intro');
if (!getEl('water-tint')) throw new Error('missing hud elements');

console.log('prebuilt chunks:', B.world.activeCount);
console.log('player position:', B.player.pos.x.toFixed(1), B.player.pos.y.toFixed(1), B.player.pos.z.toFixed(1));
console.log('begin click wired: yes (intro faded)');
console.log('BUNDLED BOOT OK');
realSetInterval(() => process.exit(0), 50);
