import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const markers = html.includes('__GAME_BUNDLE__') && html.includes('__BUNDLE_END__');
if (!markers) throw new Error('bundle markers missing — not the all-in-one build');

const startIdx = html.indexOf('<script>', html.indexOf('__GAME_BUNDLE__'));
const endIdx = html.indexOf('</script>', startIdx);
let js = html.slice(startIdx + '<script>\n'.length, endIdx);

if (/^import\s/m.test(js)) throw new Error('bundle has import statements — would fail offline');
if (!/render\(scene, camera\)/.test(js)) throw new Error('bundle missing render call');
if (js.length < 200000) throw new Error(`bundle suspiciously small (${js.length} bytes) — Three.js was not inlined`);

js = js.replace(/new ((?:[A-Za-z$_][\w$]*\.)*)WebGLRenderer\(\{[^{}]*\}\)/g, 'new __StubRenderer()');
if (/WebGLRenderer\(/.test(js)) throw new Error('harness patch failed: WebGLRenderer not stubbed');
js = `function __StubRenderer() {
  this.domElement = globalThis.__gameCanvas;
  this.setPixelRatio = () => {};
  this.setSize = () => {};
  this.render = () => {};
  this.dispose = () => {};
  this.shadowMap = { enabled: false, type: null };
  this.debug = {};
}
${js}`;

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
globalThis.__gameCanvas = gameCanvas;

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
globalThis.document.body = new DomElement('body');

globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
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

const bootHook = '\nglobalThis.__BOOT = { player, world, env, camera, scene };\n';
const tail = js.lastIndexOf('})();');
if (tail === -1) throw new Error('IIFE tail not found');
js = js.slice(0, tail) + bootHook + js.slice(tail);
writeFileSync(new URL('../.tmp-bundle.mjs', import.meta.url), js);
await import('../.tmp-bundle.mjs');

const B = globalThis.__BOOT;
if (!B) throw new Error('boot did not run to completion');
if (!Number.isFinite(B.player.pos.x)) throw new Error('player position is NaN');
if (B.world.activeCount < 25) throw new Error(`expected at least 25 prebuilt chunks, got ${B.world.activeCount}`);

(getEl('btn-begin').handlers.click || []).forEach((fn) => fn());
if (!getEl('intro').classList.contains('fade')) throw new Error('begin button did not fade the intro');

console.log('prebuilt chunks:', B.world.activeCount);
console.log('player position:', B.player.pos.x.toFixed(1), B.player.pos.y.toFixed(1), B.player.pos.z.toFixed(1));
console.log('begin click wired: yes (intro faded)');
console.log('BUNDLED BOOT OK (offline all-in-one)');
realSetInterval(() => process.exit(0), 50);
