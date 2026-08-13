import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const OUT_DIR = process.env.AUDIT_OUT || 'artifacts/playwright-audit';

const publicRoutes = [
  '/', '/la-casa', '/cocina', '/carta', '/carta/vinos', '/galeria', '/reservar', '/consultar-reserva', '/contacto',
  '/aviso-legal', '/privacidad', '/cookies', '/condiciones-reserva',
  '/en', '/en/about', '/en/cuisine', '/en/menu', '/en/menu/wines', '/en/gallery', '/en/reserve', '/en/check-booking',
  '/en/contact', '/en/legal', '/en/privacy', '/en/cookies', '/en/booking-terms',
  '/control/login', '/control',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
];

const screenshotRoutes = new Set(['/', '/reservar', '/carta', '/galeria', '/control/login']);
const results = [];
const interactionResults = [];

function safeName(route) {
  return (route === '/' ? 'home' : route.replace(/^\//, '').replaceAll('/', '-')) || 'home';
}

function severityFor(kind) {
  return ['navigation', 'page-error', 'server-error', 'overflow', 'broken-image', 'native-control', 'interaction'].includes(kind) ? 'critical' : 'warning';
}

function issue(kind, message, detail = null) {
  return { kind, severity: severityFor(kind), message, detail };
}

async function installObservers(page) {
  await page.addInitScript(() => {
    window.__lbAudit = { cls: 0, lcp: 0, longTasks: 0, longTaskDuration: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__lbAudit.lcp = Math.max(window.__lbAudit.lcp, entry.startTime);
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {}
    try {
      let cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value;
        window.__lbAudit.cls = cls;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__lbAudit.longTasks += 1;
          window.__lbAudit.longTaskDuration += entry.duration;
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
  });
}

async function inspectPage(page, route, viewport, response, signals) {
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(900);

  const dom = await page.evaluate(() => {
    const visible = (el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || '1') > 0 && r.width > 0 && r.height > 0;
    };
    const labelFor = (el) => {
      const aria = el.getAttribute('aria-label') || el.getAttribute('title');
      if (aria?.trim()) return aria.trim();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) return text.slice(0, 100);
      const imgAlt = el.querySelector?.('img')?.getAttribute('alt');
      return imgAlt?.trim() || '';
    };
    const selectors = ['body *'];
    const overflowers = [...document.querySelectorAll(selectors.join(','))]
      .filter(visible)
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 120), text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
      })
      .filter((item) => item.right > document.documentElement.clientWidth + 2 || item.left < -2)
      .slice(0, 12);

    const nativeControls = [...document.querySelectorAll('select,input[type="date"],input[type="time"],input[type="datetime-local"],input[type="month"],input[type="week"],input[type="range"]')]
      .filter(visible)
      .map((el) => ({ tag: el.tagName.toLowerCase(), type: el.getAttribute('type') || '', name: el.getAttribute('name') || '', cls: String(el.className || '').slice(0, 100) }));

    const brokenImages = [...document.images].filter((img) => visible(img) && img.complete && img.naturalWidth === 0).map((img) => img.currentSrc || img.src).slice(0, 12);
    const missingAlt = [...document.images].filter((img) => visible(img) && !img.hasAttribute('alt')).map((img) => img.currentSrc || img.src).slice(0, 12);
    const interactive = [...document.querySelectorAll('a[href],button,input:not([type="hidden"]),textarea,select,[role="button"],[role="switch"]')].filter(visible);
    const unnamed = interactive.filter((el) => !labelFor(el)).map((el) => ({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 100) })).slice(0, 12);
    const smallTargets = interactive.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width < 40 || r.height < 40;
    }).map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), label: labelFor(el).slice(0, 60), w: Math.round(r.width), h: Math.round(r.height) };
    }).slice(0, 20);
    const tinyText = [...document.querySelectorAll('p,span,small,label,a,button,dt,dd,li')].filter(visible).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 9).map((el) => ({ tag: el.tagName.toLowerCase(), px: getComputedStyle(el).fontSize, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70) })).slice(0, 20);

    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
    const resources = performance.getEntriesByType('resource');
    const transfer = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const audit = window.__lbAudit || {};

    return {
      title: document.title,
      lang: document.documentElement.lang,
      h1: document.querySelectorAll('h1').length,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
      overflowers,
      nativeControls,
      brokenImages,
      missingAlt,
      unnamed,
      smallTargets,
      tinyText,
      performance: {
        domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
        load: nav ? Math.round(nav.loadEventEnd) : null,
        responseStart: nav ? Math.round(nav.responseStart) : null,
        fcp: paints['first-contentful-paint'] ?? null,
        lcp: Math.round(audit.lcp || 0),
        cls: Number((audit.cls || 0).toFixed(4)),
        longTasks: audit.longTasks || 0,
        longTaskDuration: Math.round(audit.longTaskDuration || 0),
        resources: resources.length,
        transferKB: Math.round(transfer / 1024),
      },
    };
  });

  const issues = [];
  const status = response?.status() ?? null;
  const finalUrl = page.url();
  if (route !== '/control' && (!status || status >= 400)) issues.push(issue('navigation', `La ruta respondió con ${status ?? 'estado desconocido'}.`));
  if (route === '/control' && !finalUrl.includes('/control/login')) issues.push(issue('interaction', 'El acceso privado sin sesión no terminó en /control/login.', { finalUrl }));
  if (dom.horizontalOverflow) issues.push(issue('overflow', `Scroll horizontal: documento ${dom.documentWidth}px > viewport ${dom.viewportWidth}px.`, dom.overflowers));
  if (dom.brokenImages.length) issues.push(issue('broken-image', `${dom.brokenImages.length} imágenes visibles rotas.`, dom.brokenImages));
  if (dom.nativeControls.length) issues.push(issue('native-control', `${dom.nativeControls.length} controles nativos visibles.`, dom.nativeControls));
  if (signals.pageErrors.length) issues.push(issue('page-error', `${signals.pageErrors.length} errores JavaScript no controlados.`, signals.pageErrors));
  const serverErrors = signals.responses.filter((r) => r.status >= 500);
  if (serverErrors.length) issues.push(issue('server-error', `${serverErrors.length} respuestas 5xx.`, serverErrors));
  if (signals.requestFailures.length) issues.push(issue('request-failure', `${signals.requestFailures.length} peticiones fallidas.`, signals.requestFailures));
  if (signals.consoleErrors.length) issues.push(issue('console-error', `${signals.consoleErrors.length} errores de consola.`, signals.consoleErrors));
  if (dom.missingAlt.length) issues.push(issue('a11y', `${dom.missingAlt.length} imágenes visibles sin atributo alt.`, dom.missingAlt));
  if (dom.unnamed.length) issues.push(issue('a11y', `${dom.unnamed.length} controles interactivos sin nombre accesible.`, dom.unnamed));
  if (viewport.name === 'mobile' && dom.smallTargets.length) issues.push(issue('touch-target', `${dom.smallTargets.length} targets visibles menores de 40×40 px.`, dom.smallTargets));
  if (dom.tinyText.length) issues.push(issue('legibility', `${dom.tinyText.length} textos visibles por debajo de 9 px.`, dom.tinyText));
  if (dom.h1 !== 1 && !route.startsWith('/control')) issues.push(issue('semantics', `La página contiene ${dom.h1} h1.`));
  if (dom.performance.lcp > 4500) issues.push(issue('performance', `LCP alto: ${dom.performance.lcp} ms.`));
  if (dom.performance.cls > 0.1) issues.push(issue('performance', `CLS alto: ${dom.performance.cls}.`));
  if (dom.performance.longTaskDuration > 1000) issues.push(issue('performance', `Long tasks acumuladas: ${dom.performance.longTaskDuration} ms.`));

  return { route, viewport: viewport.name, status, finalUrl, ...dom, issues };
}

async function auditRoute(browser, route, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_privacy_notice', value: 'acknowledged', url: BASE_URL }]);
  const page = await context.newPage();
  await installObservers(page);
  const signals = { consoleErrors: [], pageErrors: [], requestFailures: [], responses: [] };
  page.on('console', (msg) => { if (msg.type() === 'error') signals.consoleErrors.push(msg.text().slice(0, 500)); });
  page.on('pageerror', (err) => signals.pageErrors.push(String(err.message || err).slice(0, 500)));
  page.on('requestfailed', (request) => signals.requestFailures.push({ url: request.url(), error: request.failure()?.errorText || 'failed' }));
  page.on('response', (response) => {
    try {
      const u = new URL(response.url());
      if (u.origin === new URL(BASE_URL).origin && response.status() >= 400) signals.responses.push({ url: u.pathname, status: response.status() });
    } catch {}
  });

  let response = null;
  try {
    response = await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (error) {
    signals.pageErrors.push(`Navigation: ${error.message}`);
  }
  const result = await inspectPage(page, route, viewport, response, signals);
  if (screenshotRoutes.has(route) || result.issues.some((i) => i.severity === 'critical')) {
    const file = path.join(OUT_DIR, 'screenshots', `${viewport.name}-${safeName(route)}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true });
  }
  await context.close();
  return result;
}

async function interactionAudit(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'lb_privacy_notice', value: 'acknowledged', url: BASE_URL }]);

  // Mobile navigation: opens, locks body and closes with Escape.
  {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    const button = page.locator('.public-menu-button');
    const issues = [];
    try {
      await button.click();
      await page.waitForTimeout(150);
      const open = await button.getAttribute('aria-expanded');
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      if (open !== 'true') issues.push(issue('interaction', 'El menú móvil no comunica aria-expanded=true al abrir.'));
      if (bodyOverflow !== 'hidden') issues.push(issue('interaction', 'El menú móvil no bloquea el scroll de fondo.'));
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      if (width.scroll > width.client + 2) issues.push(issue('overflow', 'El menú móvil abierto genera scroll horizontal.', width));
      await page.keyboard.press('Escape');
      if (await button.getAttribute('aria-expanded') !== 'false') issues.push(issue('interaction', 'Escape no cierra el menú móvil.'));
    } catch (error) { issues.push(issue('interaction', `Falló el flujo del menú móvil: ${error.message}`)); }
    interactionResults.push({ name: 'mobile-menu', issues });
    await page.close();
  }

  // Booking: enter step 2 and ensure custom calendar/no native date control.
  {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/reservar`, { waitUntil: 'domcontentloaded' });
    const issues = [];
    try {
      await page.getByRole('button', { name: /Continuar/i }).click();
      await page.waitForTimeout(150);
      if (!await page.locator('.calendar, .bocana-calendar, [class*="calendar"]').first().isVisible().catch(() => false)) issues.push(issue('interaction', 'El paso de fecha no muestra un calendario custom visible.'));
      const native = await page.locator('input[type="date"],input[type="datetime-local"],select').filter({ visible: true }).count().catch(() => 0);
      if (native) issues.push(issue('native-control', `Reserva muestra ${native} controles nativos en el paso de fecha.`));
      const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      if (width.scroll > width.client + 2) issues.push(issue('overflow', 'El paso de calendario de Reserva desborda horizontalmente.', width));
      await mkdir(path.join(OUT_DIR, 'screenshots'), { recursive: true });
      await page.screenshot({ path: path.join(OUT_DIR, 'screenshots', 'mobile-booking-calendar.png'), fullPage: true });
    } catch (error) { issues.push(issue('interaction', `Falló la navegación inicial de reserva: ${error.message}`)); }
    interactionResults.push({ name: 'booking-calendar', issues });
    await page.close();
  }

  // Safe lookup with deliberately nonexistent details.
  {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/consultar-reserva`, { waitUntil: 'domcontentloaded' });
    const issues = [];
    try {
      await page.locator('input[name="phone"]').fill('+34999000123');
      await page.locator('input[name="email"]').fill('qa-no-existe@invalid.example');
      await page.getByRole('button', { name: /Consultar reserva/i }).click();
      await page.waitForFunction(() => document.body.textContent?.includes('No hemos encontrado') || document.querySelector('[role="alert"]'), null, { timeout: 12000 });
      const feedback = await page.locator('[role="status"],[role="alert"]').count();
      if (!feedback) issues.push(issue('interaction', 'Consulta de reserva no muestra feedback visible después de buscar.'));
    } catch (error) { issues.push(issue('interaction', `Falló el flujo seguro de consulta: ${error.message}`)); }
    interactionResults.push({ name: 'booking-lookup', issues });
    await page.close();
  }

  // Invalid login: pending feedback then explicit error.
  {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/control/login`, { waitUntil: 'domcontentloaded' });
    const issues = [];
    try {
      await page.locator('input[name="email"]').fill('qa-no-existe@invalid.example');
      await page.locator('input[name="password"]').fill('incorrecta-qa-1234');
      await page.getByRole('button', { name: /Entrar a Control/i }).click();
      const pendingSeen = await page.waitForFunction(() => document.querySelector('form[aria-busy="true"]') || document.body.textContent?.includes('Comprobando acceso'), null, { timeout: 2500 }).then(() => true).catch(() => false);
      if (!pendingSeen) issues.push(issue('interaction', 'Login no muestra estado de carga perceptible al enviar.'));
      const errorSeen = await page.waitForFunction(() => document.body.textContent?.includes('Email o contraseña incorrectos') || document.body.textContent?.includes('No se ha podido iniciar sesión'), null, { timeout: 12000 }).then(() => true).catch(() => false);
      if (!errorSeen) issues.push(issue('interaction', 'Login no muestra un error explícito para credenciales inválidas.'));
    } catch (error) { issues.push(issue('interaction', `Falló la prueba de login inválido: ${error.message}`)); }
    interactionResults.push({ name: 'invalid-login-feedback', issues });
    await page.close();
  }

  await context.close();
}

function buildMarkdown(report) {
  const critical = report.issues.filter((i) => i.severity === 'critical');
  const warnings = report.issues.filter((i) => i.severity === 'warning');
  const lines = [
    '# La Bocana · Playwright production audit', '',
    `- Base: ${BASE_URL}`,
    `- Routes × viewports: ${report.pages.length}`,
    `- Critical issues: ${critical.length}`,
    `- Warnings: ${warnings.length}`,
    '', '## Critical',
  ];
  if (!critical.length) lines.push('No critical issues detected.');
  for (const item of critical) lines.push(`- **${item.route || item.test} · ${item.viewport || 'interaction'} · ${item.kind}** — ${item.message}`);
  lines.push('', '## Warnings');
  if (!warnings.length) lines.push('No warnings detected.');
  for (const item of warnings.slice(0, 120)) lines.push(`- **${item.route || item.test} · ${item.viewport || 'interaction'} · ${item.kind}** — ${item.message}`);
  lines.push('', '## Performance snapshot');
  for (const page of report.pages.filter((p) => p.viewport === 'mobile' && ['/', '/reservar', '/carta', '/galeria', '/control/login'].includes(p.route))) {
    const p = page.performance;
    lines.push(`- ${page.route}: response ${p.responseStart} ms · FCP ${p.fcp} ms · LCP ${p.lcp} ms · CLS ${p.cls} · transfer ${p.transferKB} KB · resources ${p.resources}`);
  }
  return `${lines.join('\n')}\n`;
}

await mkdir(path.join(OUT_DIR, 'screenshots'), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    for (const route of publicRoutes) {
      process.stdout.write(`AUDIT ${viewport.name} ${route}\n`);
      const result = await auditRoute(browser, route, viewport);
      results.push(result);
      const criticalCount = result.issues.filter((i) => i.severity === 'critical').length;
      if (criticalCount) process.stdout.write(`  -> ${criticalCount} critical\n`);
    }
  }
  await interactionAudit(browser);
} finally {
  await browser.close();
}

const flattened = [];
for (const page of results) for (const item of page.issues) flattened.push({ route: page.route, viewport: page.viewport, ...item });
for (const test of interactionResults) for (const item of test.issues) flattened.push({ test: test.name, ...item });
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  pages: results,
  interactions: interactionResults,
  issues: flattened,
  summary: {
    pages: results.length,
    critical: flattened.filter((i) => i.severity === 'critical').length,
    warnings: flattened.filter((i) => i.severity === 'warning').length,
  },
};
await writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
await writeFile(path.join(OUT_DIR, 'report.md'), buildMarkdown(report));
console.log(`AUDIT_SUMMARY ${JSON.stringify(report.summary)}`);
for (const item of flattened.filter((i) => i.severity === 'critical').slice(0, 80)) console.log(`CRITICAL ${JSON.stringify(item)}`);

if (report.summary.critical > 0) process.exitCode = 1;
