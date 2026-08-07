import { NextResponse } from 'next/server';
import { confirmReservation } from '@/lib/reservations/service';
import { asEmail, asPhone, asString, asUuid } from '@/lib/reservations/validation';
import { requestFingerprint } from '@/lib/security/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'confirm-reservation', 8, 300);
    const body = await request.json();
    if (body.companyWebsite) throw new Error('Solicitud rechazada.');
    if (body.privacyAccepted !== true) throw new Error('Debes aceptar la política de privacidad.');
    const result = await confirmReservation(asUuid(body.holdId, 'El bloqueo'), {
      firstName: asString(body.firstName, 80, 'El nombre'),
      lastName: asString(body.lastName, 120, 'Los apellidos'),
      email: asEmail(body.email),
      phone: asPhone(body.phone),
      allergies: asString(body.allergies ?? '', 1000, 'Las alergias', false),
      preferences: asString(body.preferences ?? '', 1000, 'Las preferencias', false),
      notes: asString(body.notes ?? '', 1500, 'Las notas', false),
      privacyAccepted: true,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
