import { createSampler, WATER_LEVEL, colorAt } from '../src/gen.js';

const seed = Number(process.argv[2] ?? 12345);
const s = createSampler(seed);

const N = 400;
const EXTENT = 9000;
const t0 = performance.now();

let min = Infinity;
let max = -Infinity;
let sum = 0;
let water = 0;
let beach = 0;
let snowy = 0;
let msum = 0;

for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const x = (i / (N - 1) - 0.5) * EXTENT;
    const z = (j / (N - 1) - 0.5) * EXTENT;
    const h = s.height(x, z);
    min = Math.min(min, h);
    max = Math.max(max, h);
    sum += h;
    if (h < WATER_LEVEL) water++;
    else if (h < WATER_LEVEL + 2.2) beach++;
    if (h > 44) snowy++;
    msum += s.moisture(x, z);
  }
}
const sampleMs = (performance.now() - t0) / (N * N);

const fieldT0 = performance.now();
const SEG = 64;
for (let k = 0; k < 8; k++) {
  const ox = k * 137;
  for (let jj = 0; jj < SEG + 3; jj++) {
    for (let ii = 0; ii < SEG + 3; ii++) {
      s.height(ox + ii * 1.5, jj * 1.5);
    }
  }
}
const fieldMs = (performance.now() - fieldT0) / 8;

const total = N * N;
console.log('seed', seed);
console.log('height min/mean/max', min.toFixed(1), (sum / total).toFixed(1), max.toFixed(1));
console.log('water %', ((water / total) * 100).toFixed(1));
console.log('beach %', ((beach / total) * 100).toFixed(1));
console.log('snowy %', ((snowy / total) * 100).toFixed(1));
console.log('mean moisture', (msum / total).toFixed(3));
console.log('per-sample ms', sampleMs.toFixed(4));
console.log('per-67x67-field ms', fieldMs.toFixed(2));

let found = 0;
for (let r = 0; r < 40 && found < 3; r++) {
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const x = Math.cos(ang) * r * 12;
    const z = Math.sin(ang) * r * 12;
    const h = s.height(x, z);
    const hx = s.height(x + 2, z) - s.height(x - 2, z);
    const hz = s.height(x, z + 2) - s.height(x, z - 2);
    const slope = Math.hypot(hx, hz) / 4;
    if (h > 2 && h < 14 && slope < 0.35) {
      console.log('spawn candidate', x.toFixed(0), z.toFixed(0), 'h', h.toFixed(1), 'slope', slope.toFixed(2));
      found++;
      break;
    }
  }
}

console.log('color sample', colorAt(6, 0.2, 0.6).map((v) => v.toFixed(2)).join(','));
