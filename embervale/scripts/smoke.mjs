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

const THREE = await import('three');
const { ChunkManager, RETENTION_MS } = await import('../src/world.js');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1.777, 0.25, 7000);
camera.position.set(0, 24, 0);
camera.lookAt(200, 12, 0);
camera.updateMatrixWorld();
camera.matrixWorldInverse.copy(camera.matrixWorld).invert();

const world = new ChunkManager(scene, 12345);
let restores = 0;
world.onRestore = () => restores++;

function snapInstanced(chunk) {
  const out = [];
  chunk.group.traverse((o) => {
    if (o.isInstancedMesh) {
      const m = new THREE.Matrix4();
      const list = [];
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        list.push([m.elements[12].toFixed(2), m.elements[13].toFixed(2), m.elements[14].toFixed(2)]);
      }
      out.push(list);
    }
  });
  return out;
}

const t0 = performance.now();
world.update(camera, new THREE.Vector3(0, 20, 0));
console.log('queued after first update:', world.queue.length);

world.buildChunk(2, 0);
const c1 = world.chunks.get('2,0');
console.log('chunk built in', (performance.now() - t0).toFixed(1), 'ms, fires:', c1.fires.length);

world.buildChunk(0, 0);
const c0first = world.chunks.get('0,0');
const heightsCopy = Float32Array.from(c0first.data.heights);
const instBefore = JSON.stringify(snapInstanced(c0first));
console.log('snapshot taken of chunk 0,0');

const fire = world.addCampfire(12, world.heightAt(12, 4), 4);
console.log('campfire added:', !!fire, 'edits:', world.edits.has('0,0'));

camera.position.set(100, 30, 0);
camera.updateMatrixWorld();
camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
const playerPos = new THREE.Vector3(150, 20, 0);

world.update(camera, playerPos);
const seenRefreshMS = c1.lastSeen;
if (seenRefreshMS <= performance.now() - 50) throw new Error('visible chunk not marked seen');
console.log('visible chunk refreshes lastSeen: OK');

world.update(camera, playerPos);
const c1b = world.chunks.get('2,0');
console.log('chunk still loaded while visible:', !!c1b);

const c0 = world.chunks.get('0,0');
c0.lastSeen -= RETENTION_MS + 10;
const far = new THREE.Vector3(15000, 20, 0);
world.update(camera, far);
console.log('after 15s unseen:', !world.chunks.has('0,0'), '| deleted:', world.deletedCount, '| cached:', world.cachedCount);

world.buildChunk(0, 0);
const c2 = world.chunks.get('0,0');
if (!c2) throw new Error('chunk not rebuilt when player returned');
if (c2.data.heights.length !== heightsCopy.length) throw new Error('field size mismatch');
let identical = true;
for (let i = 0; i < heightsCopy.length; i++) {
  if (heightsCopy[i] !== c2.data.heights[i]) { identical = false; break; }
}
console.log('heightfield bit-identical after restore:', identical);
console.log('scatter instances identical:', JSON.stringify(snapInstanced(c2)) === instBefore);
console.log('restore callback count:', restores >= 1, restores);

const fires2 = [];
for (const f of c2.fires) fires2.push([f.pos.x.toFixed(1), f.pos.z.toFixed(1)]);
console.log('campfire persisted through unload:', fires2.length === 1 && fires2[0][0] === '12.0', fires2);

const buildT0 = performance.now();
for (let k = 0; k < 9; k++) world.buildChunk(3 + (k % 3), 1 + ((k / 3) | 0));
console.log('avg chunk build ms:', ((performance.now() - buildT0) / 9).toFixed(1));
console.log('active:', world.activeCount, 'cached:', world.cachedCount);
console.log('SMOKE OK');
