import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(root + p, 'utf8');

const css = read('style.css');
const html = read('dev.html');

execSync('npx esbuild src/main.js --bundle --format=iife --outfile=.tmp-game.js --log-level=warning', {
  cwd: root,
  stdio: 'inherit'
});
const js = read('.tmp-game.js');
rmSync(root + '.tmp-game.js');

if (/^import\s/m.test(js) || /^import\s/m.test(js.split('\n')[0])) {
  throw new Error('bundle contains import statements — not fully self-contained');
}
if (!js.includes('render(scene, camera)')) {
  throw new Error('bundle seems to be missing the render call');
}

const page = html
  .replace('<link rel="stylesheet" href="style.css" />', `<style>\n${css}\n</style>`)
  .replace(
    '<script type="module" src="src/main.js"></script>',
    `<!-- __GAME_BUNDLE__ all-in-one: Three.js and the entire game inlined, works offline -->\n<script>\n${js}\n</script>\n<!-- __BUNDLE_END__ -->`
  );

mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'index.html', page);
copyFileSync(root + 'index.html', root + 'dist/embervale.html');
console.log('wrote index.html + dist/embervale.html —', (page.length / 1024).toFixed(0) + ' kb, fully self-contained');
