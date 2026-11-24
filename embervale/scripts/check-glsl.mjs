import { readFileSync } from 'node:fs';
import glslParser from '@shaderfrog/glsl-parser/parser/index.js';
const parse = glslParser.parse ?? glslParser.default ?? glslParser;

const chunkDir = new URL('../node_modules/three/src/renderers/shaders/ShaderChunk/', import.meta.url);
const chunkCache = new Map();

function resolveChunk(line) {
  const name = line.trim().match(/^#include\s+<(.+)>/);
  if (!name) return line;
  const key = name[1];
  if (!chunkCache.has(key)) {
    const src = readFileSync(new URL(`${key}.glsl.js`, chunkDir), 'utf8');
    const body = src.match(/export default \/\* glsl \*\/\s*`([\s\S]*?)`;?/);
    if (!body) throw new Error('cannot extract chunk ' + key);
    chunkCache.set(key, preprocess(body[1]));
  }
  return chunkCache.get(key);
}

function preprocess(src, depth = 0) {
  if (depth > 8) throw new Error('include recursion too deep');
  return src
    .split('\n')
    .map((line) => (/^\s*#include\s+</.test(line) ? resolveChunk(line) : line))
    .join('\n');
}

const envSrc = readFileSync(new URL('../src/environment.js', import.meta.url), 'utf8');
const shaders = {};
for (const name of ['SKY_VERT', 'SKY_FRAG', 'WATER_VERT', 'WATER_FRAG']) {
  const m = envSrc.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  shaders[name] = preprocess(m[1]);
  console.log(name, m[1].length, 'chars');
}

let bad = 0;
for (const [name, src] of Object.entries(shaders)) {
  try {
    const ast = parse(src, { quiet: true });
    console.log('PARSE OK  ', name, '| top-level nodes:', ast.program ? ast.program.length : ast.length ?? 0);
  } catch (e) {
    bad++;
    console.log('PARSE FAIL', name, '|', String(e.message).split('\n')[0]);
  }
}

if (/^\s*#include/m.test(shaders.WATER_VERT) || /^\s*#include/m.test(shaders.WATER_FRAG)) {
  bad++;
  console.log('FAIL: unresolved #include in water shaders');
}
if (!/float vFogDepth/.test(shaders.WATER_VERT)) { bad++; console.log('FAIL: WATER_VERT missing vFogDepth declaration'); }
if (!/vFogDepth = - mvPosition.z/.test(shaders.WATER_VERT)) { bad++; console.log('FAIL: WATER_VERT fog chunk mismatch'); }

if (bad) process.exit(1);
console.log('GLSL CHECK OK');
