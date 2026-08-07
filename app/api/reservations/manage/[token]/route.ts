import { NextResponse } from 'next/server';
import { cancelManagedReservation, getManagedReservation, modifyManagedReservation } from '@/lib/reservations/service';
import { asDate, asInt, asString, asUuid } from '@/lib/reservations/validation';
import { enforceRateLimit } from '@/lib/security/rate-limit';
import { requestFingerprint } from '@/lib/security/request';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'manage-read', 30, 60);
    const { token } = await context.params;
    const reservation = await getManagedReservation(token);
    if (!reservation) return NextResponse.json({ error: 'Reserva no encontrada.' }, { status: 404 });
    return NextResponse.json({ reservation });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'manage-cancel', 6, 300);
    const { token } = await context.params;
    let reason = '';
    try { reason = asString((await request.json()).reason ?? '', 500, 'El motivo', false); } catch { /* body opcional */ }
    const ok = await cancelManagedReservation(token, reason);
    if (!ok) return NextResponse.json({ error: 'La reserva no se puede cancelar.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'manage-modify', 8, 300);
    const { token } = await context.params;
    const body = await request.json();
    const ok = await modifyManagedReservation({
      token,
      date: asDate(body.date),
      serviceId: asUuid(body.serviceId, 'El servicio'),
      startsAt: asString(body.startsAt, 64, 'La hora'),
      adults: asInt(body.adults, 1, 30, 'Adultos'),
      children: asInt(body.children ?? 0, 0, 20, 'Niños'),
      sessionId: `manage:${token.slice(0, 12)}`,
    });
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 409 });
  }
}
