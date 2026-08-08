import { FloorPlan } from '@/components/admin/floor-plan';
import { requireStaffSession } from '@/lib/admin/auth';
import { loadFloorSnapshot } from '@/lib/admin/floor-data';

export const dynamic = 'force-dynamic';

function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function FloorPage() {
  const staff = await requireStaffSession();
  const snapshot = await loadFloorSnapshot(todayMadrid());
  return (
    <div className="admin-page floor-page real-floor-page">
      <div className="admin-page-head floor-page-head">
        <div><span className="admin-kicker">Sala · operación</span><h1>El servicio, de un vistazo.</h1><p>Mesas, reservas y movimientos conectados a Supabase, sin perder contexto del servicio.</p></div>
        <div className="floor-legend"><span><i className="dot-free"/>Libre</span><span><i className="dot-reserved"/>Reservada</span><span><i className="dot-seated"/>Sentada</span><span><i className="dot-blocked"/>Bloqueada</span></div>
      </div>
      <FloorPlan initialSnapshot={snapshot} canOperate={staff?.role === 'manager' || staff?.role === 'host'} />
    </div>
  );
}
