import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');

const css = read('style.css');
const html = read('index.html');

const order = ['rng.js', 'gen.js', 'audio.js', 'environment.js', 'player.js', 'world.js', 'main.js'];
let js = '';
for (const f of order) {
  const src = read('src/' + f)
    .replace(/^import[^\n]*from[^\n]*;\s*$/gm, '')
    .replace(/^import\s*\{[^}]*\}\s*from[^;]*;\s*$/gm, '')
    .replace(/^export\s+(const|function|class|let|var)\s/gm, '$1 ');
  js += `\n/* ===== ${f} ===== */\n` + src;
}

const page = html
  .replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`)
  .replace(
    '<script type="module" src="src/main.js"></script>',
    `<script type="module">\n${js}\n</script>`
  )
  .replace('<title>Embervale', '<!-- single-file build, source: src/ -->\n<title>Embervale');

mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/embervale.html', page);
console.log('wrote dist/embervale.html', page.length, 'bytes');
