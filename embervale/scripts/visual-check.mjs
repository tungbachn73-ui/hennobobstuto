import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';

const target = process.argv[2] || fileURLToPath(new URL('../index.html', import.meta.url));
const outPrefix = process.argv[3] || '/tmp/embervale';

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--window-size=1280,720',
    '--mute-audio'
  ],
  defaultViewport: { width: 1280, height: 720 }
});

const page = await browser.newPage();
const errors = [];
const logs = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error' || t === 'warning') logs.push(t.toUpperCase() + ': ' + m.text().slice(0, 300));
});
page.on('dialog', (d) => d.dismiss());

await page.goto(target, { waitUntil: 'load', timeout: 45000 });
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: `${outPrefix}-1-intro.png` });

const isOpen = await page.evaluate(() => {
  const el = document.getElementById('btn-begin');
  return !!el && el.offsetParent !== null;
});
console.log('begin button visible:', isOpen);

if (isOpen) {
  await page.click('#btn-begin');
  await new Promise((r) => setTimeout(r, 6000));
  await page.screenshot({ path: `${outPrefix}-2-ingame.png` });
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.mouse.move(760, 300, { steps: 10 });
  await page.mouse.up();
  await new Promise((r) => setTimeout(r, 4000));
  await page.screenshot({ path: `${outPrefix}-3-lookaround.png` });
}

const state = await page.evaluate(() => {
  const el = (id) => document.getElementById(id);
  const banner = el('boot-error');
  return {
    banner: banner ? banner.textContent.slice(0, 400) : null,
    bannerVisible: banner ? getComputedStyle(banner).display !== 'none' : null,
    hud: el('stat-chunks') ? el('stat-chunks').textContent : null,
    fps: el('stat-fps') ? el('stat-fps').textContent : null,
    introHidden: el('intro') ? el('intro').classList.contains('gone') : null,
    canvasSize: (() => {
      const c = document.querySelector('canvas');
      return c ? c.width + 'x' + c.height : 'NO CANVAS';
    })()
  };
});
console.log('state:', JSON.stringify(state, null, 2));
console.log('--- console/errors ---');
[...errors, ...logs].slice(0, 20).forEach((l) => console.log(l));

await browser.close();
