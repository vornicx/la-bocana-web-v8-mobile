import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = Number(process.env.HTTP_SMOKE_PORT ?? 3200);
const baseUrl = `http://127.0.0.1:${port}`;
const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
const hasBackendEnvironment = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY));
let logs = '';

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (chunk) => { logs += chunk.toString(); });
server.stderr.on('data', (chunk) => { logs += chunk.toString(); });

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: 'manual' });
      if (response.status === 200) return;
    } catch { /* el servidor todavía está arrancando */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`La web no arrancó a tiempo.\n${logs.slice(-4000)}`);
}

async function expectPage(path, text) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  assert.equal(response.status, 200, `${path} devolvió HTTP ${response.status}`);
  const html = await response.text();
  assert(html.includes(text), `${path} no contiene “${text}”`);
  return { response, html };
}

try {
  await waitForServer();
  const routes = [
    ['/', 'Mar de verdad.'],
    ['/la-casa', 'Una casa abierta al mar.'],
    ['/galeria', 'Una mesa abierta al mar.'],
    ['/carta', 'El Mediterráneo, plato a plato.'],
    ['/carta/vinos', 'Una botella para cada sobremesa.'],
    ['/contacto', 'El mar queda justo aquí.'],
    ['/reservar', '¿Cuántos seréis?'],
    ['/en', 'The real sea.'],
    ['/en/about', 'A house open to the sea.'],
    ['/en/gallery', 'A table open to the sea.'],
    ['/en/menu', 'The Mediterranean, dish by dish.'],
    ['/en/menu/wines', 'A bottle for every long lunch.'],
    ['/en/contact', 'The sea is right here.'],
    ['/en/reserve', 'How many guests?'],
    ['/en/legal', 'Transparency from the beginning.'],
    ['/en/privacy', 'Privacy, made clear.'],
    ['/en/cookies', 'Only what is necessary.'],
    ['/en/booking-terms', 'Your table, made clear.'],
    ['/privacidad', 'Privacidad, con claridad.'],
    ['/cookies', 'Solo lo necesario.'],
    ['/aviso-legal', 'Transparencia desde el principio.'],
    ['/condiciones-reserva', 'Tu mesa, con claridad.'],
    ['/robots.txt', 'Disallow: /admin/'],
    ['/sitemap.xml', '/reservar'],
    ['/manifest.webmanifest', 'La Bocana'],
    ['/icon.svg', 'La Bocana'],
  ];
  if (hasBackendEnvironment) routes.push(['/admin-login', 'Acceso de equipo']);
  const rendered = new Map();
  for (const [path, text] of routes) rendered.set(path, await expectPage(path, text));

  const canonicalRoutes = ['/', '/la-casa', '/galeria', '/carta', '/carta/vinos', '/contacto', '/reservar', '/en', '/en/about', '/en/gallery', '/en/menu', '/en/menu/wines', '/en/contact', '/en/reserve', '/en/legal', '/en/privacy', '/en/cookies', '/en/booking-terms'];
  for (const path of canonicalRoutes) {
    const html = rendered.get(path).html;
    const expectedCanonical = `${publicSiteUrl}${path === '/' ? '' : path}`;
    assert(html.includes('rel="canonical"'), `${path} no declara URL canónica.`);
    assert(html.includes(`href="${expectedCanonical}"`), `${path} no usa su propia URL canónica: ${expectedCanonical}`);
    assert(html.includes('href="#main-content"'), `${path} no ofrece salto al contenido.`);
    assert(html.includes('id="main-content"'), `${path} no expone el destino del salto al contenido.`);
  }

  for (const path of ['/privacidad', '/cookies', '/aviso-legal', '/condiciones-reserva', '/en/privacy', '/en/cookies', '/en/legal', '/en/booking-terms', ...(hasBackendEnvironment ? ['/admin-login'] : [])]) {
    assert(rendered.get(path).html.includes('noindex'), `${path} debe quedar fuera del índice.`);
  }

  assert(rendered.get('/').html.includes('https://schema.org'), 'La portada no incluye datos estructurados del restaurante.');
  assert(rendered.get('/en').html.includes('<html lang="en">'), 'La versión inglesa no declara lang="en".');
  assert(rendered.get('/en').html.includes('hrefLang="es"'), 'La versión inglesa no enlaza su alternativa española.');
  assert(rendered.get('/').html.includes('hrefLang="en"'), 'La versión española no enlaza su alternativa inglesa.');
  if (hasBackendEnvironment) assert(!rendered.get('/admin-login').html.includes('"@type":"Restaurant"'), 'El área privada hereda datos estructurados públicos.');

  const legacyCuisine = await fetch(`${baseUrl}/cocina`, { redirect: 'manual' });
  assert([302, 303, 307, 308].includes(legacyCuisine.status), `/cocina no redirige: HTTP ${legacyCuisine.status}`);
  assert.equal(legacyCuisine.headers.get('location'), '/carta', '/cocina no redirige a la carta.');

  if (hasBackendEnvironment) {
    const admin = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
    assert([302, 303, 307, 308].includes(admin.status), `/admin no redirige: HTTP ${admin.status}`);
    assert(admin.headers.get('location')?.includes('/admin-login'), '/admin no redirige al acceso del equipo.');
  }

  const missing = await fetch(`${baseUrl}/esta-ruta-no-existe`);
  assert.equal(missing.status, 404, `La ruta inexistente devolvió HTTP ${missing.status}`);
  const missingHtml = await missing.text();
  assert(missingHtml.includes('Esta mesa no existe.'), 'La página 404 personalizada no se renderiza.');
  assert(missingHtml.includes('noindex'), 'La página 404 no impide su indexación.');
  assert(!missingHtml.includes('content="index, follow"'), 'La página 404 contiene directivas de indexación contradictorias.');

  if (hasBackendEnvironment) {
    const invalidAvailability = await fetch(`${baseUrl}/api/reservations/availability?date=no&adults=0&children=0`);
    assert.equal(invalidAvailability.status, 400, `La validación de disponibilidad devolvió HTTP ${invalidAvailability.status}`);

    const impossibleDate = await fetch(`${baseUrl}/api/reservations/availability?date=2026-02-31&adults=2&children=0`);
    assert.equal(impossibleDate.status, 400, `Una fecha inexistente devolvió HTTP ${impossibleDate.status}`);
    assert((await impossibleDate.json()).error.includes('fecha no es válida'), 'La API acepta fechas inexistentes del calendario.');

    const waitlistWithoutPrivacy = await fetch(`${baseUrl}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
    assert.equal(waitlistWithoutPrivacy.status, 400, `La lista de espera sin privacidad devolvió HTTP ${waitlistWithoutPrivacy.status}`);
    assert((await waitlistWithoutPrivacy.json()).error.includes('privacidad'), 'La lista de espera no exige información de privacidad.');

    const allergiesWithoutConsent = await fetch(`${baseUrl}/api/reservations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ privacyAccepted: true, allergies: 'Frutos secos', healthDataConsent: false }) });
    assert.equal(allergiesWithoutConsent.status, 400, `Las alergias sin consentimiento devolvieron HTTP ${allergiesWithoutConsent.status}`);
    assert((await allergiesWithoutConsent.json()).error.includes('consentimiento explícito'), 'La API no exige consentimiento explícito para datos de salud.');
  }

  const security = await fetch(baseUrl);
  assert.equal(security.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(security.headers.get('x-frame-options'), 'DENY');
  assert(security.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
  assert.equal(security.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(security.headers.get('x-permitted-cross-domain-policies'), 'none');

  console.log(JSON.stringify({ result: 'HTTP_SMOKE_OK', publicRoutes: routes.length, systemRoutes: 5, canonicalRoutes: canonicalRoutes.length, bilingualAlternates: true, privateNoIndex: true, skipNavigation: true, structuredDataScope: true, legacyRedirect: true, manifestAndIcons: true, adminGuard: hasBackendEnvironment ? true : 'skipped_without_backend_env', custom404: true, backendValidation: hasBackendEnvironment ? true : 'skipped_without_backend_env', securityHeaders: true }));
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    server.once('exit', resolve);
    setTimeout(resolve, 2000);
  });
}
