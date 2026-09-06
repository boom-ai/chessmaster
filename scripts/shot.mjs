// Screenshot all tabs at mobile + tablet viewports for visual QA.
// Usage: node scripts/shot.mjs (expects `npm run preview -- --port 4173` running)
import { chromium } from 'playwright-core';

const shots = [];
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const tabs = ['start', 'play', 'puzzles', 'learn', 'middlegame', 'endgame', 'games', 'guide'];
for (const t of tabs) {
  await page.evaluate((tab) => {
    const btns = [...document.querySelectorAll('.tab')];
    const map = { start: 0, play: 1, puzzles: 2, learn: 3, middlegame: 4, endgame: 5, games: 6, guide: 7 };
    btns[map[tab]]?.click();
  }, t);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `/tmp/shots/${t}-top.png` });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `/tmp/shots/${t}-bottom.png` });
  await page.evaluate(() => window.scrollTo(0, 0));
  shots.push(t);
}
// landscape / small tablet
await page.setViewportSize({ width: 768, height: 600 });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/shots/play-768.png' });
console.log('shots:', shots.join(','));
await browser.close();
