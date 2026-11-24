import * as THREE from 'three';
import { ChunkManager, windUniform } from './world.js';
import { Environment } from './environment.js';
import { Player, findSpawn } from './player.js';
import { Ambience } from './audio.js';
import { WATER_LEVEL } from './gen.js';

const SAVE_KEY = 'embervale.save.v1';

const $ = (id) => document.getElementById(id);
const toastEl = $('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

let saved = null;
try {
  saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
} catch {
  saved = null;
}

const seed = saved?.seed ?? ((Math.random() * 0xffffffff) >>> 0);

const fail = window.__embervaleFail || ((msg) => console.error('[Embervale]', msg));

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false });
  } catch (e2) {
    fail('WebGL is not available in this browser, so the world cannot be drawn.\n' + (e2 && e2.message ? e2.message : ''));
    throw e2;
  }
}
renderer.debug.onShaderError = () => {
  fail('A rendering shader failed to compile.\nYour world cannot be drawn — please update your GPU/driver or try another browser.');
};
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'game';
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.25, 7000);

const env = new Environment(scene);
const world = new ChunkManager(scene, seed, env);
world.onRestore = () => toast('this place was remembered — nothing was lost');

const ambience = new Ambience();

let spawn;
const player = new Player(camera, world.sampler, { x: 0, z: 0, h: 0 });
if (saved?.player) {
  spawn = saved.player;
  player.pos.set(spawn.x, spawn.y, spawn.z);
  player.yaw = spawn.yaw ?? 0;
  player.pitch = spawn.pitch ?? 0;
  if (spawn.fly) player.toggleFly();
  $('intro').dataset.resume = 'true';
  $('intro-title').textContent = 'WELCOME BACK';
} else {
  spawn = findSpawn(world.sampler);
  player.pos.set(spawn.x, spawn.h + 1.5, spawn.z);
  player.yaw = spawn.yaw ?? 0;
}
if (saved?.edits) world.loadEdits(saved.edits);
if (saved?.time != null) env.timeOfDay = saved.time;

if (seed % 7 === 0) {
  const h = world.heightAt(player.pos.x + 4, player.pos.z);
  if (h > WATER_LEVEL + 0.4) world.addCampfire(player.pos.x + 4, h, player.pos.z);
}

const lightPool = {
  lights: [],
  center: new THREE.Vector3()
};
for (let i = 0; i < 4; i++) {
  const l = new THREE.PointLight(0xffa544, 0, 30, 2);
  l.visible = false;
  scene.add(l);
  lightPool.lights.push(l);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const locked = () => document.pointerLockElement === renderer.domElement;
let everLocked = false;
let dragLook = false;

function requestLookControl() {
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(fallbackLook);
  } catch {
    fallbackLook();
  }
}

function fallbackLook() {
  if (everLocked) return;
  everLocked = true;
  toast('pointer lock unavailable — hold and drag to look around');
}

document.addEventListener('pointerlockerror', fallbackLook);

document.addEventListener('pointerlockchange', () => {
  if (locked()) everLocked = true;
  if (everLocked) {
    $('pause').classList.toggle('hidden', locked());
    if (!locked()) player.keys.clear();
  }
});

renderer.domElement.addEventListener('click', () => {
  if (!locked() && $('intro').classList.contains('gone')) requestLookControl();
});

document.addEventListener('pointerdown', (e) => {
  if (e.target === renderer.domElement && !locked()) dragLook = true;
});

document.addEventListener('pointerup', () => {
  dragLook = false;
});

document.addEventListener('mousemove', (e) => {
  if (!locked() && !dragLook) return;
  player.yaw -= e.movementX * 0.0021;
  player.pitch -= e.movementY * 0.0021;
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.5, 1.5);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') return;
  player.keys.add(e.code);
  if (e.repeat) return;
  switch (e.code) {
    case 'Space':
      player.jump();
      break;
    case 'KeyF':
      toast(player.toggleFly() ? 'flight mode — space up · c down' : 'walking mode');
      break;
    case 'KeyT':
      env.timeFlow = !env.timeFlow;
      toast(env.timeFlow ? 'time flows — sunset drifts, night comes' : 'time pauses');
      break;
    case 'KeyM':
      toast(ambience.toggle() ? 'sound off' : 'sound on');
      break;
    case 'KeyH':
      document.body.classList.toggle('ui-hidden');
      break;
    case 'BracketLeft':
      world.radius = Math.max(3, world.radius - 1);
      toast(`draw distance ${world.radius}`);
      break;
    case 'BracketRight':
      world.radius = Math.min(9, world.radius + 1);
      toast(`draw distance ${world.radius}`);
      break;
    case 'KeyE': {
      const dir = player.forward(new THREE.Vector3());
      const x = player.pos.x + dir.x * 3;
      const z = player.pos.z + dir.z * 3;
      const h = world.heightAt(x, z);
      const slope = world.slopeAt(x, z);
      if (h > WATER_LEVEL + 0.3 && slope < 1.1) {
        world.addCampfire(x, h, z);
        toast('campfire placed — it will wait here for you');
        saveGame();
      } else {
        toast('too wet or too steep for a fire here');
      }
      break;
    }
  }
});

window.addEventListener('keyup', (e) => player.keys.delete(e.code));

$('btn-begin').addEventListener('click', () => {
  const intro = $('intro');
  intro.classList.add('fade');
  setTimeout(() => intro.classList.add('gone'), 900);
  ambience.init();
  requestLookControl();
});

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed,
      time: env.timeOfDay,
      player: {
        x: player.pos.x,
        y: player.pos.y,
        z: player.pos.z,
        yaw: player.yaw,
        pitch: player.pitch,
        fly: player.fly
      },
      edits: world.serializeEdits()
    }));
  } catch {
  }
}

window.addEventListener('beforeunload', saveGame);
setInterval(saveGame, 8000);

$('seed-label').textContent = `world ${seed.toString(16)}`;

for (let dz = -2; dz <= 2; dz++) {
  for (let dx = -2; dx <= 2; dx++) {
    world.buildChunk(Math.floor(player.pos.x / 96 + 0.5) + dx, Math.floor(player.pos.z / 96 + 0.5) + dz);
  }
}

const clock = new THREE.Clock();
let elapsed = 0;
let frames = 0;
let fpsWindow = 0;
let hudTimer = 0;
let broken = false;

function loop() {
  if (broken) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);

  try {
    elapsed += dt;
    frames++;
    fpsWindow += dt;

    player.update(dt);
    windUniform.value = elapsed;
    env.update(dt, elapsed, player.pos, camera);
    world.update(camera, player.pos);

    lightPool.center.copy(player.pos);
    world.updateEffects(elapsed, lightPool);

    const underwater = world.sampler.height(camera.position.x, camera.position.z) < WATER_LEVEL - 0.3
      && camera.position.y < WATER_LEVEL + 0.2;
    $('water-tint').style.opacity = underwater ? 1 : 0;

    const targetFov = player.sprinting ? 76 : player.fly ? 74 : 70;
    if (Math.abs(camera.fov - targetFov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.06);
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    hudTimer += dt;
    if (hudTimer > 0.3) {
      const fps = fpsWindow > 0 ? Math.round(frames / fpsWindow) : 0;
      $('stat-fps').textContent = fps;
      $('stat-pos').textContent = `${player.pos.x.toFixed(0)}, ${player.pos.y.toFixed(0)}, ${player.pos.z.toFixed(0)}`;
      $('stat-chunks').textContent =
        `${world.activeCount} active · ${world.cachedCount} cached · ${world.deletedCount} faded · ${world.restoredCount} remembered`;
      hudTimer = 0;
      frames = 0;
      fpsWindow = 0;
    }
  } catch (err) {
    broken = true;
    fail('Embervale hit an error while rendering:\n' + (err && err.stack ? err.stack : String(err)));
    throw err;
  }
}

loop();
