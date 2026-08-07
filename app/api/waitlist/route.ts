import { NextResponse } from 'next/server';
import { joinWaitlist } from '@/lib/reservations/service';
import { asDate, asEmail, asInt, asPhone, asString } from '@/lib/reservations/validation';
import { requestFingerprint } from '@/lib/security/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'waitlist', 6, 300);
    const body = await request.json();
    if (body.companyWebsite) throw new Error('Solicitud rechazada.');
    const id = await joinWaitlist({
      date: asDate(body.date),
      serviceId: body.serviceId || null,
      adults: asInt(body.adults, 1, 30, 'Adultos'),
      children: asInt(body.children ?? 0, 0, 20, 'Niños'),
      preferredTime: body.preferredTime || null,
      flexibleFrom: body.flexibleFrom || null,
      flexibleTo: body.flexibleTo || null,
      firstName: asString(body.firstName, 80, 'El nombre'),
      lastName: asString(body.lastName, 120, 'Los apellidos'),
      email: asEmail(body.email),
      phone: asPhone(body.phone),
    });
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
