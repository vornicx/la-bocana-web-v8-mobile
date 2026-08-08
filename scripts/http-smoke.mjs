import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const port = Number(process.env.HTTP_SMOKE_PORT ?? 3200);
const baseUrl = `http://127.0.0.1:${port}`;
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
  return response;
}

try {
  await waitForServer();
  const routes = [
    ['/', 'Mar de verdad.'],
    ['/cocina', 'El Mediterráneo, sin disfraz.'],
    ['/la-casa', 'Una casa familiar frente al mar.'],
    ['/galeria', 'La Bocana, a su ritmo.'],
    ['/carta', 'Producto antes que artificio.'],
    ['/contacto', 'Nos vemos junto al mar.'],
    ['/reservar', '¿Cuántos seréis?'],
    ['/privacidad', 'Privacidad, con claridad.'],
    ['/cookies', 'Solo lo necesario.'],
    ['/aviso-legal', 'Transparencia desde el principio.'],
    ['/condiciones-reserva', 'Tu mesa, con claridad.'],
    ['/admin-login', 'Acceso de equipo'],
    ['/robots.txt', 'Disallow: /admin/'],
    ['/sitemap.xml', '/reservar'],
  ];
  for (const [path, text] of routes) await expectPage(path, text);

  const admin = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
  assert([302, 303, 307, 308].includes(admin.status), `/admin no redirige: HTTP ${admin.status}`);
  assert(admin.headers.get('location')?.includes('/admin-login'), '/admin no redirige al acceso del equipo.');

  const missing = await fetch(`${baseUrl}/esta-ruta-no-existe`);
  assert.equal(missing.status, 404, `La ruta inexistente devolvió HTTP ${missing.status}`);
  assert((await missing.text()).includes('Esta mesa no existe.'), 'La página 404 personalizada no se renderiza.');

  const invalidAvailability = await fetch(`${baseUrl}/api/reservations/availability?date=no&adults=0&children=0`);
  assert.equal(invalidAvailability.status, 400, `La validación de disponibilidad devolvió HTTP ${invalidAvailability.status}`);

  const waitlistWithoutPrivacy = await fetch(`${baseUrl}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.equal(waitlistWithoutPrivacy.status, 400, `La lista de espera sin privacidad devolvió HTTP ${waitlistWithoutPrivacy.status}`);
  assert((await waitlistWithoutPrivacy.json()).error.includes('privacidad'), 'La lista de espera no exige información de privacidad.');

  const allergiesWithoutConsent = await fetch(`${baseUrl}/api/reservations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ privacyAccepted: true, allergies: 'Frutos secos', healthDataConsent: false }) });
  assert.equal(allergiesWithoutConsent.status, 400, `Las alergias sin consentimiento devolvieron HTTP ${allergiesWithoutConsent.status}`);
  assert((await allergiesWithoutConsent.json()).error.includes('consentimiento explícito'), 'La API no exige consentimiento explícito para datos de salud.');

  const security = await fetch(baseUrl);
  assert.equal(security.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(security.headers.get('x-frame-options'), 'DENY');
  assert(security.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));

  console.log(JSON.stringify({ result: 'HTTP_SMOKE_OK', publicRoutes: 11, systemRoutes: 3, adminGuard: true, custom404: true, privacyValidation: true, healthDataConsent: true, validation: true, securityHeaders: true }));
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    server.once('exit', resolve);
    setTimeout(resolve, 2000);
  });
}
