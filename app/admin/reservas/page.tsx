import { ReservationsPageClient } from './reservations-page-client';
import { requireStaffSession } from '@/lib/admin/auth';
import { loadReservationsSnapshot } from '@/lib/admin/reservations-data';

export const dynamic = 'force-dynamic';

function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function ReservationsPage() {
  const staff = await requireStaffSession();
  const snapshot = await loadReservationsSnapshot(todayMadrid());
  return <ReservationsPageClient initialSnapshot={snapshot} canOperate={staff.role === 'manager' || staff.role === 'host'} />;
}
