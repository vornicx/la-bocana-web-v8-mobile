import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const OUT_DIR = process.env.AUDIT_OUT || 'artifacts/playwright-audit';
const EMAIL = process.env.CONTROL_EMAIL || '';
const PASSWORD = process.env.CONTROL_PASSWORD || '';
if (!EMAIL || !PASSWORD) throw new Error('QA credentials are required.');

const routes = ['/control','/control/reservas','/control/sala','/control/espera','/control/calendario','/control/clientes','/control/carta','/control/analitica','/control/comunicaciones','/control/configuracion'];
const viewports = [{ name: 'mobile', width: 390, height: 844 }, { name: 'small-mobile', width: 320, height: 700 }];
const records = [];
const safeName = (route) => route.replace(/^\//, '').replaceAll('/', '-');

function analyzeSeverity(kind) {
  return ['navigation','overflow','native-control','broken-image','page-error','server-error'].includes(kind) ? 'critical' : 'warning';
}
function issue(kind, message, detail) { return { kind, severity: analyzeSeverity(kind), message, detail }; }

async function inspect(page, route, viewport) {
  const data = await page.evaluate(() => {
    const isVisible = (el) => {
      const rect = el.getBoundingClientRect(); const style = getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const accessibleName = (el) => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('title');
      if (aria?.trim()) return aria.trim();
      if ('labels' in el && el.labels?.length) {
        const text = [...el.labels].map((node) => node.textContent || '').join(' ').replace(/\s+/g,' ').trim();
        if (text) return text;
      }
      return (el.textContent || '').replace(/\s+/g,' ').trim();
    };
    const vw = document.documentElement.clientWidth;
    const overflowers = [...document.querySelectorAll('body *')].filter(isVisible).map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0,90), text: (el.textContent || '').replace(/\s+/g,' ').trim().slice(0,60), left: Math.round(rect.left), right: Math.round(rect.right) };
    }).filter((item) => item.left < -2 || item.right > vw + 2).slice(0,30);
    const nativeControls = [...document.querySelectorAll('select,input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"],input[type="week"],input[type="range"],input[type="checkbox"],input[type="radio"]')]
      .filter(isVisible).filter((el) => {
        const type = el.getAttribute('type') || '';
        if (type === 'checkbox' || type === 'radio') { const style = getComputedStyle(el); return style.appearance !== 'none' && style.webkitAppearance !== 'none'; }
        return true;
      }).map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', cls: String(el.className || '').slice(0,80) }));
    const brokenImages = [...document.images].filter((img) => isVisible(img) && img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src);
    const smallTargets = [...document.querySelectorAll('button,a[href],[role="button"],[role="switch"],input:not([type="hidden"]),textarea')].filter(isVisible).filter((el) => {
      if (el.tagName === 'A' && el.closest('p,li,dd,dt')) return false;
      const rect = el.getBoundingClientRect(); return rect.width < 40 || rect.height < 40;
    }).map((el) => { const r = el.getBoundingClientRect(); return { label: accessibleName(el).slice(0,70), w: Math.round(r.width), h: Math.round(r.height) }; }).slice(0,40);
    const tinyText = [...document.querySelectorAll('p,span,small,label,a,button,dt,dd,li')].filter(isVisible).filter((el) => (el.textContent || '').trim() && parseFloat(getComputedStyle(el).fontSize) < 9).map((el) => ({ px: getComputedStyle(el).fontSize, text: (el.textContent || '').replace(/\s+/g,' ').trim().slice(0,70) })).slice(0,40);
    const unnamed = [...document.querySelectorAll('button,a[href],input:not([type="hidden"]),textarea,[role="button"],[role="switch"]')].filter(isVisible).filter((el) => !accessibleName(el)).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0,80) })).slice(0,20);
    return { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, overflowers, nativeControls, brokenImages, smallTargets, tinyText, unnamed };
  });
  const issues = [];
  if (!page.url().includes(route)) issues.push(issue('navigation', `${route} terminó en ${page.url()}.`));
  if (data.scrollWidth > data.clientWidth + 2) issues.push(issue('overflow', `${route}: ${data.scrollWidth}px > ${data.clientWidth}px.`, data.overflowers));
  if (data.nativeControls.length) issues.push(issue('native-control', `${route}: ${data.nativeControls.length} controles nativos visibles.`, data.nativeControls));
  if (data.brokenImages.length) issues.push(issue('broken-image', `${route}: imágenes rotas.`, data.brokenImages));
  if (data.smallTargets.length) issues.push(issue('touch-target', `${route}: ${data.smallTargets.length} targets menores de 40×40.`, data.smallTargets));
  if (data.tinyText.length) issues.push(issue('legibility', `${route}: ${data.tinyText.length} textos por debajo de 9px.`, data.tinyText));
  if (data.unnamed.length) issues.push(issue('a11y', `${route}: ${data.unnamed.length} controles sin nombre accesible.`, data.unnamed));
  return { route, viewport: viewport.name, ...data, issues };
}

await mkdir(path.join(OUT_DIR, 'control-mobile-continuation'), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
    const origin = new URL(BASE_URL);
    await context.addCookies([{ name: 'lb_privacy_notice', value: 'acknowledged', domain: origin.hostname, path: '/', sameSite: 'Lax', secure: origin.protocol === 'https:' }]);
    const login = await context.newPage();
    await login.goto(`${BASE_URL}/control/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await login.locator('input[name="email"]').fill(EMAIL);
    await login.locator('input[name="password"]').fill(PASSWORD);
    await login.getByRole('button', { name: /Entrar a Control/i }).click();
    await login.waitForURL(/\/control(?!\/login)/, { timeout: 15000 });
    await login.close();

    for (const route of routes) {
      process.stdout.write(`MOBILE_AUTH_AUDIT ${viewport.name} ${route}\n`);
      const page = await context.newPage();
      const signals = { pageErrors: [], serverErrors: [] };
      page.on('pageerror', (error) => signals.pageErrors.push(String(error.message || error).slice(0,400)));
      page.on('response', (response) => { try { if (response.status() >= 500 && new URL(response.url()).origin === origin.origin) signals.serverErrors.push({ path: new URL(response.url()).pathname, status: response.status() }); } catch {} });
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(650);
      const record = await inspect(page, route, viewport);
      if (signals.pageErrors.length) record.issues.push(issue('page-error', `${route}: errores JavaScript.`, signals.pageErrors));
      if (signals.serverErrors.length) record.issues.push(issue('server-error', `${route}: respuestas 5xx.`, signals.serverErrors));
      records.push(record);
      await page.screenshot({ path: path.join(OUT_DIR, 'control-mobile-continuation', `${viewport.name}-${safeName(route)}.png`), fullPage: true });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); }

const issues = records.flatMap((record) => record.issues.map((entry) => ({ route: record.route, viewport: record.viewport, ...entry })));
const summary = { renders: records.length, critical: issues.filter((x) => x.severity === 'critical').length, warnings: issues.filter((x) => x.severity === 'warning').length };
await writeFile(path.join(OUT_DIR, 'control-mobile-continuation-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, records, issues, summary }, null, 2));
console.log(`MOBILE_AUTH_SUMMARY ${JSON.stringify(summary)}`);
for (const entry of issues.slice(0,120)) console.log(`${entry.severity === 'critical' ? 'MOBILE_AUTH_CRITICAL' : 'MOBILE_AUTH_WARNING'} ${JSON.stringify(entry)}`);
if (summary.critical) process.exitCode = 1;
