import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.CONCURRENCY_TEST_BASE_URL ?? 'http://127.0.0.1:3100';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const testRunId = `la-bocana-concurrency-${randomUUID()}`;

assert(supabaseUrl, 'Falta NEXT_PUBLIC_SUPABASE_URL.');
assert(supabaseSecret, 'Falta SUPABASE_SECRET_KEY.');

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let localServer = null;
let serverLogs = '';

async function ensureServer() {
  try {
    const response = await fetch(baseUrl, { redirect: 'manual' });
    if (response.status > 0) return;
  } catch { /* se arranca debajo */ }

  const url = new URL(baseUrl);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname), `No se puede arrancar automáticamente un servidor remoto: ${baseUrl}`);
  localServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-H', '127.0.0.1', '-p', url.port || '80'], {
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  localServer.stdout.on('data', (chunk) => { serverLogs += chunk.toString(); });
  localServer.stderr.on('data', (chunk) => { serverLogs += chunk.toString(); });

  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(baseUrl, { redirect: 'manual' });
      if (response.status > 0) return;
    } catch { /* todavía arrancando */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`La web no arrancó a tiempo.\n${serverLogs.slice(-4000)}`);
}

const madridDate = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

async function parse(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

async function findTestSlot() {
  for (let offset = 2; offset <= 14; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const value = madridDate(date);
    const response = await fetch(`${baseUrl}/api/reservations/availability?date=${value}&adults=8&children=0`, { cache: 'no-store', headers: { 'user-agent': testRunId } });
    const body = await parse(response);
    if (body.slots?.length) return { date: value, slot: body.slots[0] };
  }
  throw new Error('No se encontró un horario de prueba para 8 personas en los próximos 14 días.');
}

const created = [];

await ensureServer();
try {
  const { date, slot } = await findTestSlot();
  const attempts = Array.from({ length: 6 }, () => ({ sessionId: `concurrency-${randomUUID()}` }));
  const responses = await Promise.all(attempts.map(async ({ sessionId }) => {
    const response = await fetch(`${baseUrl}/api/reservations/hold`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': testRunId },
      body: JSON.stringify({
        date,
        adults: 8,
        children: 0,
        serviceId: slot.serviceId,
        startsAt: slot.startsAt,
        sessionId,
      }),
    });
    const body = await response.json();
    return { ok: response.ok, status: response.status, body, sessionId };
  }));

  for (const result of responses) {
    if (result.ok) created.push({ holdId: result.body.holdId, sessionId: result.sessionId });
  }

  assert(created.length > 0, 'Ningún hold concurrente fue aceptado.');
  assert(responses.some((result) => !result.ok && result.status === 409), `La prueba no llegó a agotar el inventario del horario: ${JSON.stringify(responses.map((result) => ({ status: result.status, error: result.body?.error })))}.`);

  const holdIds = created.map((item) => item.holdId);
  const { data: holds, error } = await supabase
    .from('reservation_holds')
    .select('id, assigned_table_ids, status, expires_at')
    .in('id', holdIds);
  if (error) throw error;

  assert.equal(holds?.length, created.length, 'No se pudieron recuperar todos los holds aceptados.');
  const seenTables = new Set();
  for (const hold of holds ?? []) {
    assert.equal(hold.status, 'active', `El hold ${hold.id} no quedó activo.`);
    for (const tableId of hold.assigned_table_ids ?? []) {
      assert(!seenTables.has(tableId), `Doble asignación detectada para la mesa ${tableId}.`);
      seenTables.add(tableId);
    }
  }

  console.log(JSON.stringify({
    result: 'CONCURRENCY_OK',
    date,
    startsAt: slot.startsAt,
    attempts: responses.length,
    accepted: created.length,
    rejected: responses.length - created.length,
    uniqueTables: seenTables.size,
  }));
} finally {
  await Promise.all(created.map(({ holdId, sessionId }) => fetch(`${baseUrl}/api/reservations/hold`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', 'user-agent': testRunId },
    body: JSON.stringify({ holdId, sessionId }),
  })));
  if (localServer) {
    localServer.kill('SIGTERM');
    await new Promise((resolve) => {
      localServer.once('exit', resolve);
      setTimeout(resolve, 2000);
    });
  }
}
