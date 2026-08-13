import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const OUT_DIR = process.env.AUDIT_OUT || 'artifacts/playwright-audit';
const EMAIL = process.env.CONTROL_EMAIL || '';
const PASSWORD = process.env.CONTROL_PASSWORD || '';
const DEPLOYMENT_MODE = process.env.AUDIT_DEPLOYMENT_MODE || 'unknown';

if (!EMAIL || !PASSWORD) throw new Error('Dedicated QA credentials are required for authenticated Control audit.');

const routes = [
  '/control',
  '/control/reservas',
  '/control/sala',
  '/control/espera',
  '/control/calendario',
  '/control/clientes',
  '/control/carta',
  '/control/analitica',
  '/control/comunicaciones',
  '/control/configuracion',
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const criticalKinds = new Set(['login', 'navigation', 'page-error', 'server-error', 'overflow', 'broken-image', 'native-control', 'interaction']);
const issue = (kind, message, detail = null) => ({ kind, severity: criticalKinds.has(kind) ? 'critical' : 'warning', message, detail });
const records = [];
const interactions = [];
const safeName = (route) => route.replace(/^\//, '').replaceAll('/', '-') || 'control';

function signalsFor(page) {
  const signals = { consoleErrors: [], pageErrors: [], requestFailures: [], serverErrors: [] };
  page.on('console', (msg) => { if (msg.type() === 'error') signals.consoleErrors.push(msg.text().slice(0, 500)); });
  page.on('pageerror', (error) => signals.pageErrors.push(String(error.message || error).slice(0, 500)));
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText || 'failed';
    if (error !== 'net::ERR_ABORTED') signals.requestFailures.push({ url: request.url(), error });
  });
  page.on('response', (response) => {
    if (response.status() < 500) return;
    try {
      const url = new URL(response.url());
      if (url.origin === new URL(BASE_URL).origin) signals.serverErrors.push({ path: url.pathname, status: response.status() });
    } catch {}
  });
  return signals;
}

async function inspect(page, route, viewport, signals) {
  await page.waitForTimeout(700);
  const dom = await page.evaluate(() => {
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const label = (el) => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('title');
      if (aria?.trim()) return aria.trim();
      if ('labels' in el && el.labels?.length) {
        const text = [...el.labels].map((node) => node.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 100);
      }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      return text.slice(0, 100);
    };
    const viewportWidth = document.documentElement.clientWidth;
    const overflowers = [...document.querySelectorAll('body *')].filter(visible).map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 100), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), left: Math.round(rect.left), right: Math.round(rect.right) };
    }).filter((item) => item.left < -2 || item.right > viewportWidth + 2).slice(0, 20);
    const nativeControls = [...document.querySelectorAll('select,input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"],input[type="week"],input[type="range"],input[type="checkbox"],input[type="radio"]')]
      .filter(visible)
      .filter((el) => {
        const type = el.getAttribute('type') || '';
        if (['checkbox', 'radio'].includes(type)) {
          const style = getComputedStyle(el);
          return style.appearance !== 'none' && style.webkitAppearance !== 'none';
        }
        return true;
      })
      .map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', name: el.getAttribute('name') || '', cls: String(el.className || '').slice(0, 90) }));
    const brokenImages = [...document.images].filter((img) => visible(img) && img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src).slice(0, 20);
    const unnamed = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,[role="button"],[role="switch"]')].filter(visible).filter((el) => !label(el)).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 90) })).slice(0, 20);
    const smallTargets = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,[role="button"],[role="switch"]')].filter(visible).filter((el) => {
      if (el.tagName === 'A' && el.closest('p,li,dd,dt')) return false;
      const rect = el.getBoundingClientRect();
      return rect.width < 40 || rect.height < 40;
    }).map((el) => { const rect = el.getBoundingClientRect(); return { label: label(el).slice(0, 60), w: Math.round(rect.width), h: Math.round(rect.height) }; }).slice(0, 30);
    const tinyText = [...document.querySelectorAll('p,span,small,label,a,button,dt,dd,li')].filter(visible).filter((el) => (el.textContent || '').trim() && parseFloat(getComputedStyle(el).fontSize) < 9).map((el) => ({ px: getComputedStyle(el).fontSize, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70) })).slice(0, 30);
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      overflowers,
      nativeControls,
      brokenImages,
      unnamed,
      smallTargets,
      tinyText,
      responseStart: nav ? Math.round(nav.responseStart) : null,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      title: document.title,
      h1: document.querySelectorAll('h1').length,
    };
  });

  const issues = [];
  if (!page.url().includes(route.split('?')[0])) issues.push(issue('navigation', `${route} terminó en ${page.url()}.`));
  if (dom.documentWidth > dom.viewportWidth + 2) issues.push(issue('overflow', `${route}: ${dom.documentWidth}px > ${dom.viewportWidth}px.`, dom.overflowers));
  if (dom.nativeControls.length) issues.push(issue('native-control', `${route}: ${dom.nativeControls.length} controles nativos visibles.`, dom.nativeControls));
  if (dom.brokenImages.length) issues.push(issue('broken-image', `${route}: ${dom.brokenImages.length} imágenes rotas.`, dom.brokenImages));
  if (signals.pageErrors.length) issues.push(issue('page-error', `${route}: errores JavaScript.`, signals.pageErrors));
  if (signals.serverErrors.length) issues.push(issue('server-error', `${route}: respuestas 5xx.`, signals.serverErrors));
  if (signals.requestFailures.length) issues.push(issue('request-failure', `${route}: peticiones fallidas.`, signals.requestFailures));
  if (signals.consoleErrors.length) issues.push(issue('console-error', `${route}: errores de consola.`, signals.consoleErrors));
  if (dom.unnamed.length) issues.push(issue('a11y', `${route}: controles sin nombre accesible.`, dom.unnamed));
  if (viewport.name === 'mobile' && dom.smallTargets.length) issues.push(issue('touch-target', `${route}: ${dom.smallTargets.length} targets menores de 40×40.`, dom.smallTargets));
  if (dom.tinyText.length) issues.push(issue('legibility', `${route}: ${dom.tinyText.length} textos por debajo de 9px.`, dom.tinyText));
  if (dom.h1 !== 1) issues.push(issue('semantics', `${route}: contiene ${dom.h1} h1.`));
  return { route, viewport: viewport.name, ...dom, issues };
}

async function login(context, viewportName) {
  const page = await context.newPage();
  const issues = [];
  try {
    await page.goto(`${BASE_URL}/control/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: /Entrar a Control/i }).click();
    await page.waitForURL(/\/control(?!\/login)/, { timeout: 15000 });
    if (page.url().includes('/control/login')) issues.push(issue('login', 'La cuenta QA no pudo iniciar sesión.'));
  } catch (error) {
    issues.push(issue('login', `Login QA falló: ${error.message}`));
  }
  interactions.push({ name: `qa-login-${viewportName}`, issues });
  await page.close();
  return issues.length === 0;
}

async function auditViewport(browser, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
  const authenticated = await login(context, viewport.name);
  if (!authenticated) { await context.close(); return; }

  for (const route of routes) {
    process.stdout.write(`AUTH_AUDIT ${viewport.name} ${route}\n`);
    const page = await context.newPage();
    const signals = signalsFor(page);
    try { await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
    catch (error) { signals.pageErrors.push(`Navigation: ${error.message}`); }
    const record = await inspect(page, route, viewport, signals);
    records.push(record);
    const file = path.join(OUT_DIR, 'control-auth', `${viewport.name}-${safeName(route)}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
    await page.close();
  }

  await runSafeInteractions(context, viewport);
  await context.close();
}

async function runSafeInteractions(context, viewport) {
  const page = await context.newPage();
  const issues = [];
  try {
    await page.goto(`${BASE_URL}/control`, { waitUntil: 'domcontentloaded' });
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await page.waitForTimeout(180);
    const paletteVisible = await page.locator('.control-command-palette,.command-palette,[role="dialog"]').filter({ visible: true }).count().catch(() => 0);
    if (!paletteVisible) issues.push(issue('interaction', 'Cmd/Ctrl+K no abrió un command palette visible.'));
    await page.keyboard.press('Escape');

    await page.goto(`${BASE_URL}/control/configuracion`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const trigger = page.locator('.lb-field-trigger').first();
    if (await trigger.isVisible().catch(() => false)) {
      await trigger.click();
      await page.waitForTimeout(120);
      const popover = page.locator('.lb-popover').first();
      if (!await popover.isVisible().catch(() => false)) {
        issues.push(issue('interaction', 'El primer selector custom de Configuración no abre su popover.'));
      } else {
        const bounds = await popover.boundingBox();
        if (bounds && (bounds.x < -1 || bounds.y < -1 || bounds.x + bounds.width > viewport.width + 1 || bounds.y + bounds.height > viewport.height + 1)) {
          issues.push(issue('overflow', 'Un selector custom sale del viewport.', { viewport, bounds }));
        }
      }
      await page.keyboard.press('Escape');
    } else {
      issues.push(issue('interaction', 'Configuración no expone ningún selector custom visible para comprobar.'));
    }

    await page.goto(`${BASE_URL}/control/reservas?new=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const body = (await page.locator('body').innerText()).toLowerCase();
    if (!body.includes('nueva reserva')) issues.push(issue('interaction', 'El deep-link ?new=1 no muestra el flujo de nueva reserva.'));
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (width.scroll > width.client + 2) issues.push(issue('overflow', 'El flujo de nueva reserva provoca overflow horizontal.', width));
    await page.screenshot({ path: path.join(OUT_DIR, 'control-auth', `${viewport.name}-new-reservation.png`), fullPage: true });
  } catch (error) {
    issues.push(issue('interaction', `Interacción segura de Control falló: ${error.message}`));
  }
  interactions.push({ name: `control-safe-interactions-${viewport.name}`, issues });
  await page.close();
}

function markdown(report) {
  const critical = report.issues.filter((item) => item.severity === 'critical');
  const warnings = report.issues.filter((item) => item.severity === 'warning');
  const lines = [
    '# La Bocana · Authenticated Control audit', '',
    `- Base: ${BASE_URL}`,
    `- Deployment mode: ${DEPLOYMENT_MODE}`,
    `- Authenticated renders: ${report.records.length}`,
    `- Critical: ${critical.length}`,
    `- Warnings: ${warnings.length}`,
    '', '## Critical',
    ...(critical.length ? critical.map((item) => `- **${item.route || item.test} · ${item.viewport || 'interaction'} · ${item.kind}** — ${item.message}`) : ['None.']),
    '', '## Warnings',
    ...(warnings.length ? warnings.map((item) => `- **${item.route || item.test} · ${item.viewport || 'interaction'} · ${item.kind}** — ${item.message}`) : ['None.']),
    '', '## Route timings',
    ...report.records.map((item) => `- ${item.viewport} ${item.route}: response ${item.responseStart} ms · DOM ${item.domContentLoaded} ms`),
  ];
  return `${lines.join('\n')}\n`;
}

await mkdir(path.join(OUT_DIR, 'control-auth'), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) await auditViewport(browser, viewport);
} finally {
  await browser.close();
}

const allIssues = [];
for (const record of records) for (const item of record.issues) allIssues.push({ route: record.route, viewport: record.viewport, ...item });
for (const test of interactions) for (const item of test.issues) allIssues.push({ test: test.name, ...item });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  deploymentMode: DEPLOYMENT_MODE,
  records,
  interactions,
  issues: allIssues,
  summary: {
    authenticated: true,
    renders: records.length,
    critical: allIssues.filter((item) => item.severity === 'critical').length,
    warnings: allIssues.filter((item) => item.severity === 'warning').length,
  },
};
await writeFile(path.join(OUT_DIR, 'control-auth-report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUT_DIR, 'control-auth-report.md'), markdown(report));
console.log(`AUTH_AUDIT_SUMMARY ${JSON.stringify(report.summary)}`);
for (const item of allIssues.filter((item) => item.severity === 'critical').slice(0, 80)) console.log(`AUTH_CRITICAL ${JSON.stringify(item)}`);
if (report.summary.critical) process.exitCode = 1;
