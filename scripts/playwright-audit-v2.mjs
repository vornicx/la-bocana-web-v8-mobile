import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const OUT_DIR = process.env.AUDIT_OUT || 'artifacts/playwright-audit';
const CONTROL_EMAIL = process.env.CONTROL_EMAIL || '';
const CONTROL_PASSWORD = process.env.CONTROL_PASSWORD || '';

const routes = [
  '/', '/la-casa', '/cocina', '/carta', '/carta/vinos', '/galeria', '/reservar', '/consultar-reserva', '/contacto',
  '/aviso-legal', '/privacidad', '/cookies', '/condiciones-reserva', '/reserva',
  '/en', '/en/about', '/en/cuisine', '/en/menu', '/en/menu/wines', '/en/gallery', '/en/reserve', '/en/check-booking',
  '/en/contact', '/en/legal', '/en/privacy', '/en/cookies', '/en/booking-terms', '/control/login', '/control',
];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 320, height: 700 },
];
const screenshotRoutes = new Set(['/', '/carta', '/galeria', '/reservar', '/consultar-reserva', '/control/login']);
const pages = [];
const interactions = [];

const criticalKinds = new Set(['navigation', 'page-error', 'server-error', 'overflow', 'broken-image', 'native-control', 'interaction']);
const issue = (kind, message, detail = null) => ({ kind, severity: criticalKinds.has(kind) ? 'critical' : 'warning', message, detail });
const safeName = (route) => (route === '/' ? 'home' : route.replace(/^\//, '').replaceAll('/', '-')) || 'home';

async function addObservers(page) {
  await page.addInitScript(() => {
    window.__lbAudit = { cls: 0, lcp: 0, longTasks: 0, longTaskDuration: 0 };
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lbAudit.lcp = Math.max(window.__lbAudit.lcp, e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { let cls = 0; new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value; window.__lbAudit.cls = cls; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
    try { new PerformanceObserver((list) => { for (const e of list.getEntries()) { window.__lbAudit.longTasks += 1; window.__lbAudit.longTaskDuration += e.duration; } }).observe({ type: 'longtask', buffered: true }); } catch {}
  });
}

async function warmLazyContent(page) {
  await page.evaluate(async () => {
    const max = document.documentElement.scrollHeight;
    const step = Math.max(500, window.innerHeight * .8);
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 45));
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(180);
}

function attachSignals(page) {
  const signals = { consoleErrors: [], pageErrors: [], requestFailures: [], responses: [] };
  page.on('console', (msg) => { if (msg.type() === 'error') signals.consoleErrors.push(msg.text().slice(0, 500)); });
  page.on('pageerror', (err) => signals.pageErrors.push(String(err.message || err).slice(0, 500)));
  page.on('requestfailed', (request) => {
    const error = request.failure()?.errorText || 'failed';
    if (error === 'net::ERR_ABORTED') return;
    signals.requestFailures.push({ url: request.url(), error });
  });
  page.on('response', (response) => {
    try {
      const url = new URL(response.url());
      if (url.origin === new URL(BASE_URL).origin && response.status() >= 400) signals.responses.push({ url: url.pathname, status: response.status() });
    } catch {}
  });
  return signals;
}

async function inspect(page, route, viewport, response, signals) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(750);
  const dom = await page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0 && r.width > 0 && r.height > 0;
    };
    const labelFor = (el) => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('title');
      if (aria?.trim()) return aria.trim();
      if ('labels' in el && el.labels?.length) {
        const text = [...el.labels].map((label) => label.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 100);
      }
      const wrapping = el.closest?.('label');
      if (wrapping) {
        const text = (wrapping.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) return text.slice(0, 100);
      }
      const placeholder = el.getAttribute('placeholder');
      if (placeholder?.trim()) return placeholder.trim();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text.slice(0, 100);
      const imgAlt = el.querySelector?.('img')?.getAttribute('alt');
      return imgAlt?.trim() || '';
    };
    const inlineProseLink = (el) => el.tagName === 'A' && Boolean(el.closest('p,li,dd,dt,blockquote'));
    const targetRect = (el) => {
      if (el instanceof HTMLInputElement && ['checkbox','radio'].includes(el.type) && el.closest('label')) return el.closest('label').getBoundingClientRect();
      return el.getBoundingClientRect();
    };

    const overflowers = [...document.querySelectorAll('body *')].filter(visible).map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 120), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    }).filter((x) => x.right > document.documentElement.clientWidth + 2 || x.left < -2).slice(0, 12);

    const nativeControls = [...document.querySelectorAll('select,input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"],input[type="week"],input[type="range"],input[type="checkbox"],input[type="radio"]')]
      .filter(visible)
      .filter((el) => {
        const s = getComputedStyle(el);
        if (['checkbox','radio'].includes(el.getAttribute('type') || '')) return s.appearance !== 'none' && s.webkitAppearance !== 'none';
        return true;
      })
      .map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', name: el.getAttribute('name') || '', appearance: getComputedStyle(el).appearance, cls: String(el.className || '').slice(0, 90) }));

    const brokenImages = [...document.images].filter((img) => visible(img) && img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src).slice(0, 12);
    const missingAlt = [...document.images].filter((img) => visible(img) && !img.hasAttribute('alt')).map((img) => img.currentSrc || img.src).slice(0, 12);
    const interactive = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,select,[role="button"],[role="switch"]')].filter(visible);
    const unnamed = interactive.filter((el) => !labelFor(el)).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 90) })).slice(0, 12);
    const smallTargets = interactive.filter((el) => !inlineProseLink(el)).filter((el) => {
      const r = targetRect(el); return r.width < 40 || r.height < 40;
    }).map((el) => { const r = targetRect(el); return { tag: el.tagName.toLowerCase(), label: labelFor(el).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) }; }).slice(0, 20);
    const tinyText = [...document.querySelectorAll('p,span,small,label,a,button,dt,dd,li')].filter(visible).filter((el) => {
      const text = (el.textContent || '').trim();
      if (!text) return false;
      return parseFloat(getComputedStyle(el).fontSize) < 9;
    }).map((el) => ({ tag: el.tagName.toLowerCase(), px: getComputedStyle(el).fontSize, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70) })).slice(0, 20);

    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
    const resources = performance.getEntriesByType('resource');
    const transfer = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const a = window.__lbAudit || {};
    return {
      title: document.title, lang: document.documentElement.lang, h1: document.querySelectorAll('h1').length,
      viewportWidth: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      overflowers, nativeControls, brokenImages, missingAlt, unnamed, smallTargets, tinyText,
      performance: {
        responseStart: nav ? Math.round(nav.responseStart) : null,
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        load: nav ? Math.round(nav.loadEventEnd) : null,
        fcp: paints['first-contentful-paint'] ?? null,
        lcp: Math.round(a.lcp || 0), cls: Number((a.cls || 0).toFixed(4)), longTasks: a.longTasks || 0,
        longTaskDuration: Math.round(a.longTaskDuration || 0), resources: resources.length, transferKB: Math.round(transfer / 1024),
      },
    };
  });

  const issues = [];
  const status = response?.status() ?? null;
  const finalUrl = page.url();
  if (route !== '/control' && (!status || status >= 400)) issues.push(issue('navigation', `La ruta respondió con ${status ?? 'estado desconocido'}.`));
  if (route === '/control' && !finalUrl.includes('/control/login')) issues.push(issue('interaction', 'El acceso privado sin sesión no terminó en /control/login.', { finalUrl }));
  if (dom.horizontalOverflow) issues.push(issue('overflow', `Documento ${dom.documentWidth}px > viewport ${dom.viewportWidth}px.`, dom.overflowers));
  if (dom.brokenImages.length) issues.push(issue('broken-image', `${dom.brokenImages.length} imágenes visibles rotas.`, dom.brokenImages));
  if (dom.nativeControls.length) issues.push(issue('native-control', `${dom.nativeControls.length} controles nativos visibles.`, dom.nativeControls));
  if (signals.pageErrors.length) issues.push(issue('page-error', `${signals.pageErrors.length} errores JavaScript no controlados.`, signals.pageErrors));
  const serverErrors = signals.responses.filter((r) => r.status >= 500);
  if (serverErrors.length) issues.push(issue('server-error', `${serverErrors.length} respuestas 5xx.`, serverErrors));
  if (signals.requestFailures.length) issues.push(issue('request-failure', `${signals.requestFailures.length} peticiones realmente fallidas.`, signals.requestFailures));
  if (signals.consoleErrors.length) issues.push(issue('console-error', `${signals.consoleErrors.length} errores de consola.`, signals.consoleErrors));
  if (dom.missingAlt.length) issues.push(issue('a11y', `${dom.missingAlt.length} imágenes visibles sin alt.`, dom.missingAlt));
  if (dom.unnamed.length) issues.push(issue('a11y', `${dom.unnamed.length} controles sin nombre accesible.`, dom.unnamed));
  if (viewport.name.includes('mobile') && dom.smallTargets.length) issues.push(issue('touch-target', `${dom.smallTargets.length} controles con target menor de 40×40 px.`, dom.smallTargets));
  if (dom.tinyText.length) issues.push(issue('legibility', `${dom.tinyText.length} textos visibles por debajo de 9 px.`, dom.tinyText));
  if (dom.h1 !== 1 && !route.startsWith('/control') && route !== '/reserva') issues.push(issue('semantics', `La página contiene ${dom.h1} h1.`));
  if (dom.performance.lcp > 4500) issues.push(issue('performance', `LCP alto: ${dom.performance.lcp} ms.`));
  if (dom.performance.cls > .1) issues.push(issue('performance', `CLS alto: ${dom.performance.cls}.`));
  if (dom.performance.longTaskDuration > 1000) issues.push(issue('performance', `Long tasks acumuladas: ${dom.performance.longTaskDuration} ms.`));
  return { route, viewport: viewport.name, status, finalUrl, ...dom, issues };
}

async function auditRoute(browser, route, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_privacy_notice', value: 'acknowledged', url: BASE_URL }]);
  const page = await context.newPage();
  await addObservers(page);
  const signals = attachSignals(page);
  let response = null;
  try { response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
  catch (error) { signals.pageErrors.push(`Navigation: ${error.message}`); }
  const result = await inspect(page, route, viewport, response, signals);
  if (screenshotRoutes.has(route) || result.issues.some((i) => i.severity === 'critical')) {
    await warmLazyContent(page);
    const file = path.join(OUT_DIR, 'screenshots', `${viewport.name}-${safeName(route)}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
  }
  await context.close();
  return result;
}

async function runInteraction(browser, name, fn) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_privacy_notice', value: 'acknowledged', url: BASE_URL }]);
  const page = await context.newPage();
  const issues = [];
  try { await fn(page, issues); } catch (error) { issues.push(issue('interaction', `${name}: ${error.message}`)); }
  interactions.push({ name, issues });
  await context.close();
}

async function interactionAudit(browser) {
  await runInteraction(browser, 'mobile-menu', async (page, issues) => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const button = page.locator('.public-menu-button');
    await button.click(); await page.waitForTimeout(150);
    if (await button.getAttribute('aria-expanded') !== 'true') issues.push(issue('interaction', 'El menú móvil no expone aria-expanded=true.'));
    if (await page.evaluate(() => document.body.style.overflow) !== 'hidden') issues.push(issue('interaction', 'El menú móvil no bloquea el scroll de fondo.'));
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (width.scroll > width.client + 2) issues.push(issue('overflow', 'El menú abierto desborda horizontalmente.', width));
    await page.keyboard.press('Escape');
    if (await button.getAttribute('aria-expanded') !== 'false') issues.push(issue('interaction', 'Escape no cierra el menú móvil.'));
  });

  await runInteraction(browser, 'booking-calendar', async (page, issues) => {
    await page.goto(`${BASE_URL}/reservar`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Continuar/i }).click(); await page.waitForTimeout(120);
    if (!await page.locator('.bocana-calendar').isVisible().catch(() => false)) issues.push(issue('interaction', 'El paso de fecha no muestra el calendario La Bocana.'));
    const native = await page.evaluate(() => [...document.querySelectorAll('select,input[type="date"],input[type="datetime-local"]')].filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== 'none'; }).length);
    if (native) issues.push(issue('native-control', `Reserva muestra ${native} controles nativos en calendario.`));
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    if (width.scroll > width.client + 2) issues.push(issue('overflow', 'El calendario de Reserva desborda horizontalmente.', width));
    await page.screenshot({ path: path.join(OUT_DIR, 'screenshots', 'mobile-booking-calendar.png'), fullPage: true });
  });

  await runInteraction(browser, 'booking-lookup', async (page, issues) => {
    await page.goto(`${BASE_URL}/consultar-reserva`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="phone"]').fill('+34999000123');
    await page.locator('input[name="email"]').fill('qa-no-existe@invalid.example');
    await page.getByRole('button', { name: /Consultar reserva/i }).click();
    const seen = await page.waitForFunction(() => document.body.textContent?.includes('No hemos encontrado') || document.querySelector('[role="alert"],[role="status"]'), null, { timeout: 12000 }).then(() => true).catch(() => false);
    if (!seen) issues.push(issue('interaction', 'Consulta de reserva no muestra feedback de resultado.'));
  });

  await runInteraction(browser, 'invalid-login-feedback', async (page, issues) => {
    await page.goto(`${BASE_URL}/control/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill('qa-no-existe@invalid.example');
    await page.locator('input[name="password"]').fill('incorrecta-qa-1234');
    await page.getByRole('button', { name: /Entrar a Control/i }).click();
    const pending = await page.waitForFunction(() => document.querySelector('form[aria-busy="true"]') || document.body.textContent?.includes('Comprobando acceso'), null, { timeout: 2500 }).then(() => true).catch(() => false);
    if (!pending) issues.push(issue('interaction', 'Login no muestra estado de carga al enviar.'));
    const failed = await page.waitForFunction(() => document.body.textContent?.includes('Email o contraseña incorrectos') || document.body.textContent?.includes('No se ha podido iniciar sesión'), null, { timeout: 12000 }).then(() => true).catch(() => false);
    if (!failed) issues.push(issue('interaction', 'Login no muestra error explícito para credenciales inválidas.'));
  });

  if (CONTROL_EMAIL && CONTROL_PASSWORD) {
    await runInteraction(browser, 'authenticated-control', async (page, issues) => {
      await page.goto(`${BASE_URL}/control/login`, { waitUntil: 'domcontentloaded' });
      await page.locator('input[name="email"]').fill(CONTROL_EMAIL);
      await page.locator('input[name="password"]').fill(CONTROL_PASSWORD);
      await page.getByRole('button', { name: /Entrar a Control/i }).click();
      await page.waitForURL(/\/control(?!\/login)/, { timeout: 15000 });
      for (const route of ['/control','/control/reservas','/control/sala','/control/calendario','/control/clientes','/control/carta','/control/configuracion']) {
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(450);
        const state = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, native: [...document.querySelectorAll('select,input[type="date"],input[type="time"],input[type="datetime-local"]')].filter((el) => { const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; }).length }));
        if (state.scroll > state.client + 2) issues.push(issue('overflow', `${route} desborda horizontalmente.`, state));
        if (state.native) issues.push(issue('native-control', `${route} contiene ${state.native} controles nativos visibles.`));
      }
    });
  }
}

function markdown(report) {
  const critical = report.issues.filter((i) => i.severity === 'critical');
  const warnings = report.issues.filter((i) => i.severity === 'warning');
  const lines = ['# La Bocana · Playwright production audit v2','',`- Base: ${BASE_URL}`,`- Routes × viewports: ${report.pages.length}`,`- Critical: ${critical.length}`,`- Warnings: ${warnings.length}`,`- Authenticated Control: ${CONTROL_EMAIL && CONTROL_PASSWORD ? 'yes' : 'not configured'}`,'','## Critical'];
  lines.push(...(critical.length ? critical.map((i) => `- **${i.route || i.test} · ${i.viewport || 'interaction'} · ${i.kind}** — ${i.message}`) : ['None.']));
  lines.push('','## Warnings');
  lines.push(...(warnings.length ? warnings.slice(0,160).map((i) => `- **${i.route || i.test} · ${i.viewport || 'interaction'} · ${i.kind}** — ${i.message}`) : ['None.']));
  lines.push('','## Mobile performance snapshot');
  for (const p of report.pages.filter((x) => x.viewport === 'mobile' && ['/', '/carta', '/galeria', '/reservar', '/control/login'].includes(x.route))) lines.push(`- ${p.route}: response ${p.performance.responseStart} ms · FCP ${p.performance.fcp} ms · LCP ${p.performance.lcp} ms · CLS ${p.performance.cls} · ${p.performance.transferKB} KB`);
  return `${lines.join('\n')}\n`;
}

await mkdir(path.join(OUT_DIR, 'screenshots'), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) for (const route of routes) {
    process.stdout.write(`AUDIT ${viewport.name} ${route}\n`);
    pages.push(await auditRoute(browser, route, viewport));
  }
  await interactionAudit(browser);
} finally { await browser.close(); }

const allIssues = [];
for (const page of pages) for (const item of page.issues) allIssues.push({ route: page.route, viewport: page.viewport, ...item });
for (const test of interactions) for (const item of test.issues) allIssues.push({ test: test.name, ...item });
const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, pages, interactions, issues: allIssues, summary: { pages: pages.length, critical: allIssues.filter((i) => i.severity === 'critical').length, warnings: allIssues.filter((i) => i.severity === 'warning').length, authenticatedControl: Boolean(CONTROL_EMAIL && CONTROL_PASSWORD) } };
await writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUT_DIR, 'report.md'), markdown(report));
console.log(`AUDIT_SUMMARY ${JSON.stringify(report.summary)}`);
for (const item of allIssues.filter((i) => i.severity === 'critical').slice(0,80)) console.log(`CRITICAL ${JSON.stringify(item)}`);
if (report.summary.critical) process.exitCode = 1;
