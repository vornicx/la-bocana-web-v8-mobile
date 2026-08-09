import Link from 'next/link';
import { PlusIcon } from '@/components/admin/admin-icons';
import { StatusPill } from '@/components/admin/status-pill';
import { requireStaffSession } from '@/lib/admin/auth';
import { dashboardReservationLabel, dateLabel, loadDashboardData, todayMadrid } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireStaffSession();
  const data = await loadDashboardData(todayMadrid());
  const fullDate = dateLabel(data.date, { weekday: 'long', day: 'numeric', month: 'long' });

  return <div className="admin-page">
    <div className="admin-page-head"><div><span className="admin-kicker">{fullDate}</span><h1>Servicio de hoy</h1><p>Reservas, ocupación y sala calculadas con datos reales.</p></div><Link href="/admin/reservas" className="admin-primary"><PlusIcon/>Gestionar reservas</Link></div>
    <div className="metric-grid">
      <article className="admin-metric"><span>Comensales previstos</span><strong>{data.metrics.covers}</strong><small>{data.metrics.unassigned ? `${data.metrics.unassigned} reservas sin mesa` : 'Todas las reservas tienen mesa'}</small></article>
      <article className="admin-metric"><span>Reservas activas</span><strong>{data.metrics.reservations}</strong><small>Incluye pendientes, confirmadas y servicio</small></article>
      <article className="admin-metric"><span>Ocupación prevista</span><strong>{data.metrics.occupancy}%</strong><div className="metric-track"><i style={{ width: `${data.metrics.occupancy}%` }}/></div></article>
      <article className="admin-metric"><span>Lista de espera</span><strong>{data.metrics.waitlist}</strong><small>Solicitudes activas para hoy</small></article>
    </div>
    <div className="dashboard-grid">
      <section className="admin-panel span-2"><div className="panel-head"><div><span className="admin-kicker">Próximas</span><h2>Reservas</h2></div><Link href="/admin/reservas">Ver todas</Link></div>{data.upcoming.length ? <div className="compact-reservations">{data.upcoming.map((reservation) => <div className="compact-row" key={reservation.id}><time>{reservation.time}</time><div className="compact-person"><strong>{reservation.customer}</strong><small>{dashboardReservationLabel(reservation)}{reservation.allergies ? ' · alergia registrada' : ''}</small></div><StatusPill status={reservation.status}/></div>)}</div> : <div className="admin-empty">No hay próximas reservas activas para hoy.</div>}</section>
      <section className="admin-panel"><div className="panel-head"><div><span className="admin-kicker">Semana</span><h2>Ocupación</h2></div><Link href="/admin/calendario">Calendario</Link></div><div className="week-strip">{data.week.map((day) => <div key={day.date} className={`${day.active ? 'active' : ''} ${day.closed ? 'closed' : ''}`}><span>{dateLabel(day.date, { weekday: 'short' })}</span><strong>{dateLabel(day.date, { day: 'numeric' })}</strong><small>{day.closed ? 'Cerrado' : `${day.covers} pax`}</small></div>)}</div></section>
      <section className="admin-panel"><div className="panel-head"><div><span className="admin-kicker">Demanda</span><h2>Lista de espera</h2></div><span className="count-badge">{data.waitlist.length}</span></div>{data.waitlist.length ? <div className="waitlist-list">{data.waitlist.slice(0, 4).map((item) => <div key={item.id}><time>{item.time}</time><div><strong>{item.name}</strong><small>{item.partySize} pax · {item.flexibility}</small></div></div>)}</div> : <div className="admin-empty compact-empty">Sin solicitudes activas para hoy.</div>}</section>
      <section className="admin-panel span-2 service-balance"><div><span className="admin-kicker">Servicio</span><h2>Balance de capacidad</h2><p>Ocupación calculada sobre el aforo configurado en Supabase para cada servicio.</p></div><div className="capacity-bars">{data.services.map((service) => <div key={service.id}><span>{service.name}</span><strong>{service.occupancy}%</strong><i><b style={{ width: `${service.occupancy}%` }}/></i><small>{service.covers} de {service.capacity || '—'} pax</small></div>)}</div></section>
    </div>
  </div>;
}
