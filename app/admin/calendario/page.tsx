import Link from 'next/link';
import { requireStaffSession } from '@/lib/admin/auth';
import { dateLabel, loadCalendarData, todayMadrid } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireStaffSession();
  const params = await searchParams;
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.week ?? '') ? String(params.week) : todayMadrid();
  const calendar = await loadCalendarData(anchor);

  return <div className="admin-page calendar-control-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Planificación · capacidad real</span><h1>Calendario</h1><p>Anticipa presión, cierres y carga de cada servicio antes de que lleguen a sala.</p></div><div className="admin-head-actions"><Link className="admin-secondary" href={`/control/calendario?week=${calendar.previous}`} aria-label="Semana anterior">‹</Link><strong>{dateLabel(calendar.start, { day: 'numeric', month: 'short' })}–{dateLabel(calendar.end, { day: 'numeric', month: 'short', year: 'numeric' })}</strong><Link className="admin-secondary" href={`/control/calendario?week=${calendar.next}`} aria-label="Semana siguiente">›</Link></div></div>
    <div className="calendar-week real-calendar-week">{calendar.days.map((day) => <div key={day.date} className={`calendar-day ${day.active ? 'active' : ''}`}><header><span>{dateLabel(day.date, { weekday: 'short' })}</span><strong>{dateLabel(day.date, { day: 'numeric' })}</strong></header><div className="calendar-canvas">{day.closed ? <div className="closed-card">Cerrado</div> : <div className="calendar-real-content"><div className="calendar-day-total"><strong>{day.covers} pax</strong><small>{day.reservations} reservas</small></div>{day.services.map((service) => <div className={`calendar-service ${service.closed ? 'closed-service' : ''}`} key={service.id}><div><span>{service.name}</span><strong>{service.closed ? 'Cerrado' : `${service.covers} pax`}</strong></div><i><b style={{ width: `${Math.min(100, service.occupancy)}%` }} /></i><small>{service.closed ? (service.closureReason || 'Cierre configurado') : `${service.occupancy}% de ocupación`}</small></div>)}</div>}</div></div>)}</div>
  </div>;
}
