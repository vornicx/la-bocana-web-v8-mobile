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

  const security = await fetch(baseUrl);
  assert.equal(security.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(security.headers.get('x-frame-options'), 'DENY');
  assert(security.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));

  console.log(JSON.stringify({ result: 'HTTP_SMOKE_OK', publicRoutes: 8, systemRoutes: 3, adminGuard: true, custom404: true, validation: true, securityHeaders: true }));
} finally {
  server.kill('SIGTERM');
  await new Promise((resolve) => {
    server.once('exit', resolve);
    setTimeout(resolve, 2000);
  });
}
