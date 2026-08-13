import Link from 'next/link';
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  FloorIcon,
  PlusIcon,
  WaitlistIcon,
} from '@/components/admin/admin-icons';
import { StatusPill } from '@/components/admin/status-pill';
import { requireStaffSession } from '@/lib/admin/auth';
import { loadDashboardData } from '@/lib/admin/dashboard-data';
import { dashboardReservationLabel, dateLabel, todayMadrid } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireStaffSession();
  const data = await loadDashboardData(todayMadrid());
  const fullDate = dateLabel(data.date, { weekday: 'long', day: 'numeric', month: 'long' });
  const occupancyAttention = data.metrics.occupancy >= 80;

  return <div className="admin-page control-dashboard">
    <section className="control-service-hero">
      <div className="control-service-hero-copy">
        <span className="admin-kicker">{fullDate} · operación en vivo</span>
        <h1>Servicio de hoy</h1>
        <p>Llegadas, mesas, capacidad y demanda pendiente en una lectura rápida.</p>
      </div>
      <div className="control-hero-actions">
        <Link className="primary" href="/control/reservas?new=1"><PlusIcon />Nueva reserva</Link>
        <Link className="secondary" href="/control/sala"><FloorIcon />Abrir sala</Link>
      </div>
    </section>

    <div className="metric-grid control-signal-strip" aria-label="Indicadores del servicio">
      <article className="admin-metric"><span>Comensales previstos</span><strong>{data.metrics.covers}</strong><small>{data.metrics.unassigned ? `${data.metrics.unassigned} reservas todavía sin mesa` : 'Todas las reservas tienen mesa'}</small></article>
      <article className="admin-metric"><span>Reservas activas</span><strong>{data.metrics.reservations}</strong><small>Pendientes, confirmadas y en servicio</small></article>
      <article className={`admin-metric ${occupancyAttention ? 'control-metric-attention' : ''}`}><span>Ocupación prevista</span><strong>{data.metrics.occupancy}%</strong><div className="metric-track"><i style={{ width: `${Math.min(100, data.metrics.occupancy)}%` }} /></div><small>{occupancyAttention ? 'Presión alta: revisar capacidad' : 'Capacidad dentro del rango previsto'}</small></article>
      <article className={`admin-metric ${data.metrics.waitlist ? 'control-metric-attention' : ''}`}><span>Lista de espera</span><strong>{data.metrics.waitlist}</strong><small>{data.metrics.waitlist ? 'Hay demanda pendiente de resolver' : 'Sin solicitudes activas para hoy'}</small></article>
    </div>

    <section className="control-operational-brief" aria-label="Atención operativa">
      <header><div><span className="admin-kicker">Atención operativa</span><h2>Lo que importa ahora</h2></div><small>Ordenado por impacto en el servicio</small></header>
      <div className="control-operational-list">
        <Link className={data.metrics.unassigned ? 'attention' : 'clear'} href="/control/sala">
          <span className="control-operational-icon">{data.metrics.unassigned ? <FloorIcon /> : <CheckIcon />}</span>
          <div><strong>Asignación de mesas</strong><small>{data.metrics.unassigned ? 'Hay reservas activas que necesitan mesa.' : 'Todas las reservas activas están asignadas.'}</small></div>
          <span className="control-operational-value">{data.metrics.unassigned ? `${data.metrics.unassigned} pendientes` : 'En orden'}</span>
          <ChevronRightIcon />
        </Link>
        <Link className={data.metrics.waitlist ? 'attention' : 'clear'} href="/control/espera">
          <span className="control-operational-icon">{data.metrics.waitlist ? <WaitlistIcon /> : <CheckIcon />}</span>
          <div><strong>Demanda en espera</strong><small>{data.metrics.waitlist ? 'Revisa huecos liberados antes del próximo servicio.' : 'No hay solicitudes por resolver.'}</small></div>
          <span className="control-operational-value">{data.metrics.waitlist ? `${data.metrics.waitlist} solicitudes` : 'Sin espera'}</span>
          <ChevronRightIcon />
        </Link>
        <Link className={occupancyAttention ? 'attention' : 'clear'} href="/control/calendario">
          <span className="control-operational-icon">{occupancyAttention ? <CalendarIcon /> : <CheckIcon />}</span>
          <div><strong>Capacidad prevista</strong><small>{occupancyAttention ? 'El servicio se acerca al límite configurado.' : 'La presión de sala está dentro del rango previsto.'}</small></div>
          <span className="control-operational-value">{data.metrics.occupancy}%</span>
          <ChevronRightIcon />
        </Link>
      </div>
    </section>

    <div className="dashboard-grid control-dashboard-grid">
      <section className="admin-panel span-2">
        <div className="panel-head"><div><span className="admin-kicker">Siguiente en sala</span><h2>Próximas llegadas</h2></div><Link href="/control/reservas">Ver todas</Link></div>
        {data.upcoming.length ? <div className="compact-reservations">{data.upcoming.map((reservation) => <Link className="compact-row compact-row-link" href={`/control/reservas?reservation=${reservation.id}`} key={reservation.id}><time>{reservation.time}</time><div className="compact-person"><strong>{reservation.customer}</strong><small>{dashboardReservationLabel(reservation)}{reservation.allergies ? ' · alergia registrada' : ''}</small></div><StatusPill status={reservation.status} /></Link>)}</div> : <div className="admin-empty">No hay próximas reservas activas para hoy.</div>}
      </section>

      <section className="admin-panel">
        <div className="panel-head"><div><span className="admin-kicker">7 días</span><h2>Presión semanal</h2></div><Link href="/control/calendario">Calendario</Link></div>
        <div className="week-strip">{data.week.map((day) => <div key={day.date} className={`${day.active ? 'active' : ''} ${day.closed ? 'closed' : ''}`}><span>{dateLabel(day.date, { weekday: 'short' })}</span><strong>{dateLabel(day.date, { day: 'numeric' })}</strong><small>{day.closed ? 'Cerrado' : `${day.covers} pax`}</small></div>)}</div>
      </section>

      <section className="admin-panel">
        <div className="panel-head"><div><span className="admin-kicker">Demanda pendiente</span><h2>Lista de espera</h2></div><Link href="/control/espera">Gestionar {data.waitlist.length ? `· ${data.waitlist.length}` : ''}</Link></div>
        {data.waitlist.length ? <div className="waitlist-list">{data.waitlist.slice(0, 4).map((item) => <div key={item.id}><time>{item.time}</time><div><strong>{item.name}</strong><small>{item.partySize} pax · {item.flexibility}</small></div></div>)}</div> : <div className="admin-empty compact-empty">Sin solicitudes activas para hoy.</div>}
      </section>

      <section className="admin-panel span-2 service-balance">
        <div><span className="admin-kicker">Capacidad por servicio</span><h2>Balance de sala</h2><p>Ocupación frente al aforo configurado para anticipar presión antes de que llegue a recepción.</p></div>
        <div className="capacity-bars">{data.services.map((service) => <div key={service.id}><span>{service.name}</span><strong>{service.occupancy}%</strong><i><b style={{ width: `${Math.min(100, service.occupancy)}%` }} /></i><small>{service.covers} / {service.capacity || '—'} pax</small></div>)}</div>
      </section>
    </div>
  </div>;
}
