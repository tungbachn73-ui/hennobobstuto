globalThis.document = {
  createElement: () => ({
    width: 64,
    height: 64,
    getContext: () => ({
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect() {}
    })
  })
};
globalThis.window = { AudioContext: undefined, webkitAudioContext: undefined };

const THREE = await import('three');
const { Environment } = await import('../src/environment.js');
const { Player, findSpawn } = await import('../src/player.js');
const { createSampler, WATER_LEVEL } = await import('../src/gen.js');

const scene = new THREE.Scene();
const env = new Environment(scene);
const sampler = createSampler(42);

const spawn = findSpawn(sampler);
console.log('spawn:', JSON.stringify(spawn));

const camera = new THREE.PerspectiveCamera(70, 1.777, 0.25, 7000);
const player = new Player(camera, sampler, spawn);

const startX = player.pos.x;
const startZ = player.pos.z;
player.keys.add('KeyW');
for (let i = 0; i < 120; i++) player.update(1 / 60);
console.log('moved:', Math.hypot(player.pos.x - startX, player.pos.z - startZ) > 1);
console.log('finite position:', Number.isFinite(player.pos.x) && Number.isFinite(player.pos.y) && Number.isFinite(player.pos.z));
console.log('eye above ground:', player.pos.y >= sampler.height(player.pos.x, player.pos.z) - 0.01);

const fwd = player.forward(new THREE.Vector3());
console.log('forward vector finite:', Number.isFinite(fwd.x) && fwd.length() > 0.99);

player.pos.y = sampler.height(player.pos.x, player.pos.z) + 0.01;
player.update(1 / 60);
player.jump();
console.log('jump on land sets velocity:', player.velY > 0, '| grounded flag:', player.grounded === false);

player.keys.clear();
player.toggleFly();
for (let i = 0; i < 30; i++) player.update(1 / 60);
console.log('fly mode stable:', player.pos.y > sampler.height(player.pos.x, player.pos.z));

env.update(1 / 60, 1.5, player.pos, camera);
console.log('sun distance ~280:', Math.abs(env.sun.position.distanceTo(player.pos) - 280) < 0.5);
console.log('shadow enabled at golden hour:', env.sun.castShadow);
console.log('fog density set:', env.scene === scene && scene.fog.density > 0);
console.log('sky follows camera:', env.skyMesh.position.equals(camera.position));

const timeOfDay0 = env.timeOfDay;
for (let i = 0; i < 600; i++) env.update(1 / 60, 1.5 + i / 60, player.pos, camera);
console.log('static time stays static:', env.timeOfDay === timeOfDay0);

env.timeFlow = true;
for (let i = 0; i < 60; i++) env.update(1 / 60, 2, player.pos, camera);
console.log('flowing time advances:', env.timeOfDay !== timeOfDay0);
console.log('nan check:', Number.isFinite(env.sun.intensity) && Number.isFinite(scene.fog.density));

console.log('BOOT SMOKE OK');
