import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const workspace = resolve(process.env.SUITE_WORKSPACE || 'audit-workspace');
const out = resolve(process.env.SUITE_OUT || 'artifacts/archic-visual-audit');
const report = [];
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

function serve(directory, port) {
  const base = resolve(workspace, directory);
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
      let file = normalize(join(base, pathname));
      if (!file.startsWith(base)) throw new Error('invalid path');
      const fileStat = await stat(file).catch(() => null);
      if (fileStat?.isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': mime[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('Not found');
    }
  });
  return new Promise((resolveServer) => server.listen(port, '127.0.0.1', () => resolveServer(server)));
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function inspect(page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const visible = (element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const intersectsViewport = box.right > 0 && box.left < width && box.bottom > 0 && box.top < height;
      return box.width > 0 && box.height > 0 && intersectsViewport && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0;
    };
    const elements = [...document.querySelectorAll('body *')].filter(visible);
    const overflowers = elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { tag: element.tagName.toLowerCase(), className: String(element.className || '').slice(0, 100), text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom) };
    }).filter((item) => item.left < -2 || item.right > width + 2).slice(0, 40);
    const clipped = elements.filter((element) => {
      const style = getComputedStyle(element);
      return (element.textContent || '').trim() && (element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2) && ['hidden', 'clip'].includes(style.overflow) && style.textOverflow !== 'ellipsis';
    }).map((element) => ({ tag: element.tagName.toLowerCase(), className: String(element.className || '').slice(0, 100), text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight })).slice(0, 30);
    const brokenImages = [...document.images].filter((image) => visible(image) && image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src);
    const smallTargets = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"]')].filter(visible).map((element) => { const box = element.getBoundingClientRect(); return { label: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim().slice(0, 70), width: Math.round(box.width), height: Math.round(box.height) }; }).filter((item) => item.width < 40 || item.height < 40).slice(0, 40);
    const overlays = [...document.querySelectorAll('[role="dialog"],dialog,.detail-drawer,.studio-drawer,.drawer')].filter(visible).map((element) => { const box = element.getBoundingClientRect(); return { className: String(element.className || '').slice(0, 100), left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom), insideViewport: box.left >= -1 && box.right <= width + 1 && box.top >= -1 && box.bottom <= height + 1 }; });
    return { viewportDimensions: { width, height }, documentWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, overflowers, clipped, brokenImages, smallTargets, overlays };
  });
}

async function shot(page, project, phase, viewport, screen, state = '', fullPage = true) {
  await page.waitForTimeout(180);
  const directory = join(out, project, phase, viewport);
  await mkdir(directory, { recursive: true });
  const filename = `${project}-${slug(screen)}-${viewport}${state ? `-${slug(state)}` : ''}.png`;
  await page.screenshot({ path: join(directory, filename), fullPage, animations: 'disabled' });
  const metrics = await inspect(page);
  report.push({ project, phase, viewport, screen, state, url: page.url(), filename: join(project, phase, viewport, filename), ...metrics });
}

async function pageFor(browser, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
  return { context, page, errors };
}

async function auditMfinity(browser, phase, base, viewportName, viewport) {
  const { context, page, errors } = await pageFor(browser, viewport);
  await page.goto(`${base}/control.html`, { waitUntil: 'networkidle' });
  await shot(page, 'mfinity', phase, viewportName, 'control-requests');
  const firstRequest = page.locator('[data-request-id]').first();
  if (await firstRequest.count()) {
    await firstRequest.click();
    await shot(page, 'mfinity', phase, viewportName, 'control-request-drawer', 'open', false);
    await page.locator('[data-drawer-close]').last().click();
  } else {
    const promptAnswers = ['Visual Audit Client', '+34 600 000 000'];
    page.on('dialog', async (dialog) => dialog.accept(promptAnswers.shift() || 'Visual audit'));
    await page.locator('[data-new-request]').click();
    await shot(page, 'mfinity', phase, viewportName, 'control-request-drawer', 'created', false);
    await page.locator('[data-drawer-close]').last().click();
    await page.waitForTimeout(2800);
  }
  for (const [label, screen] of [['Availability', 'control-availability'], ['Fleet', 'control-fleet'], ['Clients', 'control-clients']]) {
    const navigationButton = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
    await navigationButton.evaluate((button) => button.click());
    await shot(page, 'mfinity', phase, viewportName, screen);
  }
  await page.getByRole('button', { name: /Requests/i }).first().evaluate((button) => button.click());
  await page.locator('[data-search]').fill('NO-RESULT-VISUAL-AUDIT');
  await shot(page, 'mfinity', phase, viewportName, 'control-requests', 'empty');
  if (viewportName === 'mobile') {
    await page.locator('[data-mobile-nav]').click();
    await shot(page, 'mfinity', phase, viewportName, 'control-mobile-navigation', 'open', false);
  }
  report.push({ project: 'mfinity', phase, viewport: viewportName, screen: 'runtime-errors', errors });
  await context.close();
}

async function auditBoat(browser, phase, base, viewportName, viewport) {
  const { context, page, errors } = await pageFor(browser, viewport);
  await page.goto(`${base}/control/`, { waitUntil: 'networkidle' });
  await shot(page, 'marbella-boat-charter', phase, viewportName, 'control-all-sections');
  for (const id of ['overview', 'bookings', 'leads', 'quotes', 'fleet', 'availability', 'owners', 'crew', 'maintenance', 'catering', 'content', 'reports']) {
    const section = page.locator(`#${id}`);
    if (!await section.count()) continue;
    await section.scrollIntoViewIfNeeded();
    await shot(page, 'marbella-boat-charter', phase, viewportName, `control-${id}`, '', false);
  }
  if (viewportName === 'mobile') {
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, 'marbella-boat-charter', phase, viewportName, 'control-mobile-navigation', 'visible', false);
  }
  report.push({ project: 'marbella-boat-charter', phase, viewport: viewportName, screen: 'runtime-errors', errors });
  await context.close();
}

async function auditPublic(browser, project, phase, base, viewportName, viewport) {
  const { context, page, errors } = await pageFor(browser, viewport);
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await shot(page, project, phase, viewportName, 'public-home');
  report.push({ project, phase, viewport: viewportName, screen: 'runtime-errors', errors });
  await context.close();
}

async function clickTab(page, label) {
  const button = page.getByRole('button', { name: new RegExp(`^${label}`, 'i') }).first();
  if (!await button.count()) return false;
  await button.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(120);
  return true;
}

async function auditStudio(browser, phase, base, viewportName, viewport) {
  const { context, page, errors } = await pageFor(browser, viewport);
  const studioUrl = new URL('/studio', base);
  if (phase === 'after' && process.env.MFS_SHARE_TOKEN) studioUrl.searchParams.set('_vercel_share', process.env.MFS_SHARE_TOKEN);
  await page.goto(studioUrl.toString(), { waitUntil: 'networkidle' });
  if (phase === 'after' && process.env.MFS_CSS_OVERRIDE) {
    const css = await readFile(resolve(process.env.MFS_CSS_OVERRIDE), 'utf8');
    await page.addStyleTag({ content: css });
  }
  await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-overview');
  for (const [label, screen] of [['Enquiries', 'studio-enquiries'], ['Viewings', 'studio-viewings'], ['Properties', 'studio-properties'], ['Insights', 'studio-insights'], ['Content & SEO', 'studio-content-seo']]) {
    if (!await clickTab(page, label)) continue;
    await shot(page, 'marbella-for-sale', phase, viewportName, screen);
    if (label === 'Enquiries') {
      const lead = page.getByRole('button', { name: /Open enquiry from/i }).first();
      if (await lead.count()) {
        await lead.click();
        await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-enquiry-drawer', 'open', false);
        await page.getByRole('button', { name: 'Close enquiry' }).last().click();
      }
      const search = page.locator('.pipeline-search input');
      if (await search.count()) {
        await search.fill('NO-RESULT-VISUAL-AUDIT');
        await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-enquiries', 'empty');
        await search.fill('');
      }
    }
    if (label === 'Properties') {
      const candidates = page.locator('.managed-property-card');
      if (await candidates.count()) {
        await candidates.first().click();
        await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-property-editor', 'open', false);
        await page.getByRole('button', { name: 'Close property editor' }).last().click();
      }
      const search = page.locator('.property-manager-search input');
      if (await search.count()) {
        await search.fill('NO-RESULT-VISUAL-AUDIT');
        await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-properties', 'empty');
        await search.fill('');
      }
    }
  }
  await clickTab(page, 'Enquiries');
  const newEnquiry = page.getByRole('button', { name: /New enquiry/i }).first();
  if (await newEnquiry.count()) {
    await newEnquiry.click();
    await shot(page, 'marbella-for-sale', phase, viewportName, 'studio-new-enquiry', 'open', false);
  }
  report.push({ project: 'marbella-for-sale', phase, viewport: viewportName, screen: 'runtime-errors', errors });
  await context.close();
}

const production = {
  mfinity: 'https://mfinity-premium.vercel.app',
  boat: 'https://marbellaboatcharter.vercel.app',
  zusto: 'https://zustocafe.vercel.app',
  samer: 'https://amerpeluqueria.vercel.app',
  studio: 'https://marbellaforsale.vercel.app',
};
const local = { mfinity: 'http://127.0.0.1:4101', boat: 'http://127.0.0.1:4102', zusto: 'http://127.0.0.1:4103', samer: 'http://127.0.0.1:4104', studio: process.env.MFS_BASE_URL || 'http://127.0.0.1:4105' };
const servers = [];
let browser;
async function runAudit(label, task) {
  try {
    await task();
  } catch (error) {
    report.push({ project: 'audit-runner', phase: label, screen: 'capture-error', errors: [error instanceof Error ? error.message : String(error)] });
  }
}
try {
  servers.push(await serve('mfinity', 4101));
  servers.push(await serve('marbella-boat-charter', 4102));
  servers.push(await serve('zusto-cafe', 4103));
  servers.push(await serve('samer-barber-shop', 4104));
  browser = await chromium.launch({ headless: true });
  for (const [viewportName, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
    await runAudit(`mfinity-before-${viewportName}`, () => auditMfinity(browser, 'before', production.mfinity, viewportName, viewport));
    await runAudit(`mfinity-after-${viewportName}`, () => auditMfinity(browser, 'after', local.mfinity, viewportName, viewport));
    await runAudit(`boat-before-${viewportName}`, () => auditBoat(browser, 'before', production.boat, viewportName, viewport));
    await runAudit(`boat-after-${viewportName}`, () => auditBoat(browser, 'after', local.boat, viewportName, viewport));
    await runAudit(`zusto-before-${viewportName}`, () => auditPublic(browser, 'zusto-cafe', 'before', production.zusto, viewportName, viewport));
    await runAudit(`zusto-after-${viewportName}`, () => auditPublic(browser, 'zusto-cafe', 'after', local.zusto, viewportName, viewport));
    await runAudit(`samer-before-${viewportName}`, () => auditPublic(browser, 'samer-barber-shop', 'before', production.samer, viewportName, viewport));
    await runAudit(`samer-after-${viewportName}`, () => auditPublic(browser, 'samer-barber-shop', 'after', local.samer, viewportName, viewport));
    await runAudit(`studio-before-${viewportName}`, () => auditStudio(browser, 'before', production.studio, viewportName, viewport));
    await runAudit(`studio-after-${viewportName}`, () => auditStudio(browser, 'after', local.studio, viewportName, viewport));
  }
} finally {
  if (browser) await browser.close();
  await Promise.all(servers.map((server) => new Promise((resolveServer) => server.close(resolveServer))));
  await mkdir(out, { recursive: true });
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2));
}

console.log(`ARCHIC_VISUAL_AUDIT ${JSON.stringify({ records: report.length, issues: report.filter((item) => item.overflowers?.length || item.clipped?.length || item.brokenImages?.length || item.overlays?.some((overlay) => !overlay.insideViewport) || item.errors?.length).length })}`);
