import { NextResponse } from 'next/server';
import { getAvailability } from '@/lib/reservations/service';
import { asDate, asInt } from '@/lib/reservations/validation';
import { requestFingerprint } from '@/lib/security/request';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function GET(request: Request) {
  try {
    await enforceRateLimit(requestFingerprint(request), 'availability', 60, 60);
    const url = new URL(request.url);
    const date = asDate(url.searchParams.get('date'));
    const adults = asInt(url.searchParams.get('adults'), 1, 30, 'Adultos');
    const children = asInt(url.searchParams.get('children') ?? 0, 0, 20, 'Niños');
    const slots = await getAvailability({ date, adults, children });
    return NextResponse.json({ slots });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
