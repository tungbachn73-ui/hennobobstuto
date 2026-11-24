import { makeRng, makeNoise2D } from './rng.js';

export const WATER_LEVEL = 0;

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep01(edge0, edge1, v) {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

const C_LUSH = [0.34, 0.46, 0.21];
const C_DRY = [0.66, 0.56, 0.29];
const C_SAND = [0.82, 0.72, 0.50];
const C_ROCK = [0.46, 0.43, 0.40];
const C_SNOW = [0.93, 0.94, 0.97];
const C_SEABED = [0.25, 0.31, 0.27];

function mix3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

export function colorAt(h, slope, moist) {
  let c = mix3(C_DRY, C_LUSH, smoothstep01(0.3, 0.68, moist));
  c = mix3(c, C_SAND, smoothstep01(2.2, 0.7, h) * smoothstep01(-3.5, -0.4, h));
  c = mix3(c, C_SEABED, smoothstep01(-0.8, -7, h));
  c = mix3(c, C_ROCK, smoothstep01(0.55, 1.2, slope));
  const snowLine = 44 + moist * 10;
  c = mix3(c, C_SNOW, smoothstep01(snowLine, snowLine + 9, h) * (1 - smoothstep01(0.8, 1.5, slope)));
  return c;
}

export function createSampler(seed) {
  const nA = makeNoise2D(makeRng(seed));
  const nB = makeNoise2D(makeRng(seed ^ 0x9e3779b9));
  const nC = makeNoise2D(makeRng((Math.imul(seed, 48271) + 11) | 0));

  function fbm(n, x, y, octaves) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += n(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return (sum / norm) * 0.5 + 0.5;
  }

  function ridged(n, x, y, octaves) {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      const v = 1 - Math.abs(n(x * freq, y * freq));
      sum += v * v * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2.1;
    }
    return sum / norm;
  }

  function height(x, z) {
    const wx = x + (fbm(nB, x * 0.0032, z * 0.0032, 2) - 0.5) * 46;
    const wz = z + (fbm(nB, x * 0.0032 + 7.3, z * 0.0032 - 3.1, 2) - 0.5) * 46;

    const cont = fbm(nA, wx * 0.00042, wz * 0.00042, 3);
    const hills = fbm(nA, wx * 0.0038, wz * 0.0038, 4);

    let h = (cont - 0.34) * 52;
    h += (hills - 0.5) * 20;

    const mask = smoothstep01(0.52, 0.8, cont) * smoothstep01(4, 18, h);
    const ridge = ridged(nC, wx * 0.0016, wz * 0.0016, 4);
    h += Math.pow(ridge, 2.2) * mask * 115;

    h += nC(x * 0.045, z * 0.045) * 0.7;
    return h;
  }

  function moisture(x, z) {
    return fbm(nB, x * 0.00085 + 11.7, z * 0.00085 - 47.2, 3);
  }

  return { height, moisture, fbm: fbm.bind(null, nC) };
}
