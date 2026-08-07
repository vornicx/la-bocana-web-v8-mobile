import { NextResponse } from 'next/server';
import { createHold, releaseHold } from '@/lib/reservations/service';
import { asDate, asInt, asString, asUuid } from '@/lib/reservations/validation';
import { requestFingerprint } from '@/lib/security/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'hold', 15, 60);
    const body = await request.json();
    const date = asDate(body.date);
    const adults = asInt(body.adults, 1, 30, 'Adultos');
    const children = asInt(body.children ?? 0, 0, 20, 'Niños');
    const serviceId = asUuid(body.serviceId, 'El servicio');
    const startsAt = asString(body.startsAt, 64, 'La hora');
    const sessionId = asString(body.sessionId, 100, 'La sesión');
    const hold = await createHold({ date, adults, children, serviceId, startsAt, sessionId });
    return NextResponse.json(hold, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const holdId = asUuid(body.holdId, 'El bloqueo');
    const sessionId = asString(body.sessionId, 100, 'La sesión');
    const ok = await releaseHold(holdId, sessionId);
    return NextResponse.json({ ok });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
