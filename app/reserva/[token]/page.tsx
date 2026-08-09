import ManageReservation from './reservation-manager';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getManagedReservation } from '@/lib/reservations/service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Gestionar reserva', robots: { index: false, follow: false, noarchive: true, noimageindex: true } };

function madridDate() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function ManageReservationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reservation = await getManagedReservation(token);
  if (!reservation) notFound();
  const minDate = madridDate();
  return <ManageReservation token={token} initial={reservation} minDate={minDate} maxDate={addDays(minDate, 90)} />;
}
