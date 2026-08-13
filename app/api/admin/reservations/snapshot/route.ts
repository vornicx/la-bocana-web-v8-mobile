import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { loadReservationsSnapshot } from '@/lib/admin/reservations-data';

export const dynamic = 'force-dynamic';

function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function GET(request: Request) {
  try {
    await requireStaffSession();
    const date = new URL(request.url).searchParams.get('date') ?? todayMadrid();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida.');
    return NextResponse.json(await loadReservationsSnapshot(date), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
