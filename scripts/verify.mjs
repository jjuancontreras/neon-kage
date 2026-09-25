// NEON KAGE verification: serves dist/, walks all five chapters at desktop and
// mobile sizes (normal + prefers-reduced-motion), screenshots each chapter,
// counts console/page errors, checks frames are not blank, and exercises the
// hidden terminal's `help` command.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from 'playwright';

const ROOT = resolve('dist');
const OUT = resolve('verify/screenshots');
const PORT = 4179;
const CHAPTERS = ['arrival', 'market', 'datastream', 'shrine', 'ascent'];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json',
};

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, query: '?quality=high', isMobile: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, query: '', isMobile: true },
];

if (!existsSync(join(ROOT, 'index.html'))) {
  console.error('dist/ is missing — run `npm run build` first.');
  process.exit(1);
}

function serve() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const rel = normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    let file = join(ROOT, rel || 'index.html');
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

/** Luminance standard deviation of a PNG, computed in the page (no image deps). */
async function frameStats(page, png) {
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = Math.round((img.height / img.width) * 160);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let sum = 0;
    let sq = 0;
    const n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += l;
      sq += l * l;
    }
    const mean = sum / n;
    return { mean, std: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
  }, png.toString('base64'));
}

async function waitFrames(page, count, timeout = 120_000) {
  const start = await page.evaluate(() => window.__neon.frames());
  await page.waitForFunction((target) => window.__neon.frames() >= target, start + count, { timeout, polling: 100 });
}

async function checkTerminal(page) {
  await page.keyboard.press('Backquote');
  await page.waitForSelector('#terminal:not([hidden])', { timeout: 5000 });
  await page.keyboard.type('help');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const text = await page.locator('.terminal-log').innerText();
  await page.screenshot({ path: join(OUT, 'terminal-help.png') });
  await page.keyboard.press('Escape');
  const required = ['help', 'jack-in', 'glitch', 'rain off'];
  const missing = required.filter((r) => !text.includes(r));
  return { ok: missing.length === 0, missing, text };
}

async function run(browser, base, vp, reducedMotion) {
  const context = await browser.newContext({
    viewport: vp.viewport,
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: 1,
    reducedMotion,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const label = `${vp.name}${reducedMotion === 'reduce' ? ' (reduced motion)' : ''}`;
  const dir = reducedMotion === 'reduce' ? join(OUT, 'reduced') : OUT;
  mkdirSync(dir, { recursive: true });

  await page.goto(`${base}/${vp.query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__neon && window.__neon.ready(), null, { timeout: 60_000 });
  const webgl = await page.evaluate(() => window.__neon.webgl);
  await page.waitForTimeout(2500); // title scramble + HUD line draw

  const shots = [];
  for (let i = 0; i < CHAPTERS.length; i++) {
    await page.evaluate((idx) => window.__neon.goto(idx, true), i);
    await page.waitForTimeout(reducedMotion === 'reduce' ? 900 : 600);
    if (webgl) await waitFrames(page, 45);
    await page.waitForTimeout(400);
    const chapter = await page.evaluate(() => window.__neon.chapter());
    const file = join(dir, `${vp.name}-0${i + 1}-${CHAPTERS[i]}.png`);
    const png = await page.screenshot({ path: file });
    const stats = await frameStats(page, png);
    shots.push({ file, chapter, expected: i, ...stats, blank: stats.std < 6 });
  }

  let terminal = null;
  if (reducedMotion !== 'reduce' && vp.name === 'desktop') terminal = await checkTerminal(page);

  await context.close();
  return { label, webgl, consoleErrors, pageErrors, shots, terminal };
}

const server = await serve();
const base = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

const results = [];
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const vp of VIEWPORTS) {
      const t0 = Date.now();
      const r = await run(browser, base, vp, reducedMotion);
      r.seconds = ((Date.now() - t0) / 1000).toFixed(1);
      results.push(r);
      console.log(`✓ ${r.label} done in ${r.seconds}s`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

let failed = false;
console.log('\n================ NEON KAGE VERIFY ================');
for (const r of results) {
  const blanks = r.shots.filter((s) => s.blank).length;
  const wrong = r.shots.filter((s) => s.chapter !== s.expected).length;
  console.log(`\n▶ ${r.label}  | webgl=${r.webgl} | console errors=${r.consoleErrors.length} | page errors=${r.pageErrors.length} | blank=${blanks} | wrong-chapter=${wrong}`);
  r.consoleErrors.forEach((e) => console.log(`   console.error: ${e}`));
  r.pageErrors.forEach((e) => console.log(`   pageerror: ${e}`));
  for (const s of r.shots) {
    console.log(`   ${s.file.replace(resolve('.') + '\\', '').replace(resolve('.') + '/', '')}  chapter=${s.chapter + 1}  luma μ=${s.mean.toFixed(1)} σ=${s.std.toFixed(1)}${s.blank ? '  ⚠ BLANK' : ''}`);
  }
  if (!r.webgl || blanks || wrong || r.consoleErrors.length || r.pageErrors.length) failed = true;
  if (r.terminal) {
    console.log(`   terminal help: ${r.terminal.ok ? 'OK' : `MISSING ${r.terminal.missing.join(', ')}`}`);
    console.log(r.terminal.text.split('\n').map((l) => `     │ ${l}`).join('\n'));
    if (!r.terminal.ok) failed = true;
  }
}
const totalConsole = results.reduce((a, r) => a + r.consoleErrors.length, 0);
const totalPage = results.reduce((a, r) => a + r.pageErrors.length, 0);
const totalShots = results.reduce((a, r) => a + r.shots.length, 0);
console.log(`\nTOTAL: ${totalShots} screenshots · ${totalConsole} console errors · ${totalPage} page errors`);
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
