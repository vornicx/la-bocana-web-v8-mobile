import { NextResponse } from 'next/server';
import { findPublicReservations } from '@/lib/reservations/service';
import { asEmail, asPhone, asString } from '@/lib/reservations/validation';
import { requestFingerprint } from '@/lib/security/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'lookup-reservation', 6, 300);
    const body = await request.json();
    if (body.companyWebsite) throw new Error('Solicitud rechazada.');

    const email = asEmail(body.email);
    const phone = asPhone(body.phone);
    const name = asString(body.name ?? '', 160, 'El nombre', false);
    const reservations = await findPublicReservations({ email, phone, name });

    return NextResponse.json({ reservations });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
