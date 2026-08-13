import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const OUT_DIR = process.env.AUDIT_OUT || 'artifacts/playwright-audit';
const MODE = process.env.AUDIT_DEPLOYMENT_MODE || 'unknown';
const routes = ['/', '/la-casa', '/carta', '/carta/vinos', '/galeria', '/reservar', '/en', '/en/about', '/en/menu', '/en/gallery', '/en/reserve'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small-mobile', width: 320, height: 700 },
];

const results = [];
const candidateCount = (srcset = '') => srcset.split(',').map((item) => item.trim()).filter(Boolean).length;

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    for (const route of routes) {
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.evaluate(async () => {
        for (const image of [...document.images]) {
          try { image.loading = 'eager'; image.scrollIntoView({ block: 'center' }); await image.decode(); } catch {}
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(250);
      const images = await page.evaluate(() => {
        const visible = (el) => {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
        };
        return [...document.images].filter(visible).map((img) => {
          const rect = img.getBoundingClientRect();
          const picture = img.closest('picture');
          const sources = picture ? [...picture.querySelectorAll('source')] : [];
          return {
            src: img.currentSrc || img.src,
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            imgSrcset: img.getAttribute('srcset') || '',
            imgSizes: img.getAttribute('sizes') || '',
            sourceSrcsets: sources.map((source) => source.getAttribute('srcset') || ''),
            sourceSizes: sources.map((source) => source.getAttribute('sizes') || ''),
          };
        });
      });

      const problems = images.filter((image) => {
        if (image.width < 180 || image.height < 120 || image.naturalWidth <= 0) return false;
        const sets = [image.imgSrcset, ...image.sourceSrcsets].filter(Boolean);
        const maxCandidates = sets.reduce((max, set) => Math.max(max, set.split(',').map((item) => item.trim()).filter(Boolean).length), 0);
        const hasSizes = Boolean(image.imgSizes || image.sourceSizes.some(Boolean));
        const oversizeRatio = image.width ? image.naturalWidth / image.width : 1;
        return maxCandidates < 2 || !hasSizes || (oversizeRatio > 2.2 && maxCandidates < 3);
      }).map((image) => ({
        ...image,
        maxCandidates: [image.imgSrcset, ...image.sourceSrcsets].filter(Boolean).reduce((max, set) => Math.max(max, candidateCount(set)), 0),
        oversizeRatio: image.width ? Number((image.naturalWidth / image.width).toFixed(2)) : null,
      }));

      results.push({ route, viewport: viewport.name, images: images.length, problems });
      process.stdout.write(`RESPONSIVE_IMAGE_AUDIT ${viewport.name} ${route} · ${problems.length} issue(s)\n`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const issues = results.flatMap((result) => result.problems.map((image) => ({ route: result.route, viewport: result.viewport, image })));
const exactDeployment = MODE === 'exact-sha';
const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  deploymentMode: MODE,
  summary: { renders: results.length, issues: issues.length, blocking: exactDeployment ? issues.length : 0 },
  results,
  issues,
};
await writeFile(path.join(OUT_DIR, 'responsive-image-report.json'), JSON.stringify(report, null, 2));
console.log(`RESPONSIVE_IMAGE_SUMMARY ${JSON.stringify(report.summary)}`);
for (const entry of issues.slice(0, 80)) console.log(`RESPONSIVE_IMAGE_ISSUE ${JSON.stringify(entry)}`);
if (exactDeployment && issues.length) process.exitCode = 1;
