import ManageReservation from './reservation-manager';
import { getManagedReservation } from '@/lib/reservations/service';

export const dynamic = 'force-dynamic';

export default async function ManageReservationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reservation = await getManagedReservation(token);
  if (!reservation) {
    return <main className="manage-page"><div className="manage-shell"><div className="wordmark">LA BOCANA</div><h1>Reserva no encontrada.</h1><p className="muted">El enlace puede haber caducado o no ser válido.</p></div></main>;
  }
  return <ManageReservation token={token} initial={reservation} />;
}
