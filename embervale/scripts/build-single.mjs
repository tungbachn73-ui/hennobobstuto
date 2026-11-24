import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';

const ERROR_CATCHER = `<script>
(function () {
  function fail(msg) {
    var el = document.getElementById('boot-error');
    if (!el) return;
    el.style.display = 'flex';
    el.textContent = msg;
  }
  window.addEventListener('error', function (e) {
    var m = e && e.message ? e.message : 'script could not load';
    fail('Embervale failed to start:\\n' + m + '\\n\\nIf you opened this from a ZIP: open embervale.html or index.html (both self-contained)\\nby double-clicking, or serve the folder with a local server.\\nThe multi-file page (dev.html) needs internet access to load Three.js.');
  }, true);
  if (typeof WebGLRenderingContext === 'undefined') {
    fail('Your browser does not support WebGL, which Embervale needs to render its world.');
  }
})();
</script>`;

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');

const css = read('style.css');
const html = read('dev.html');

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
  .replace('<title>Embervale', `<!-- single-file build of dev.html via scripts/build-single.mjs -->\n<title>Embervale`)
  .replace('</head>', `${ERROR_CATCHER}\n</head>`);

console.log('boot-error slot present:', page.includes('id="boot-error"'));
console.log('leftover imports:', (page.match(/from '\.\/|from "\.\/"/g) || []).length);

mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'index.html', page);
copyFileSync(root + 'index.html', root + 'embervale.html');
writeFileSync(root + 'dist/embervale.html', page);
console.log('wrote index.html, embervale.html, dist/embervale.html —', page.length, 'bytes each');
