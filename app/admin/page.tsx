import Link from 'next/link';
import { dashboardMetrics, reservations, waitlist, weekDays } from '@/lib/admin/mock-data';
import { PlusIcon } from '@/components/admin/admin-icons';
import { StatusPill } from '@/components/admin/status-pill';

export default function AdminDashboard(){
 const upcoming=reservations.filter(r=>!['completed','cancelled','no_show'].includes(r.status)).slice(0,6);
 return <div className="admin-page">
  <div className="admin-page-head"><div><span className="admin-kicker">Viernes, 14 de agosto</span><h1>Servicio de hoy</h1><p>Vista rápida de reservas, ocupación y sala.</p></div><button className="admin-primary"><PlusIcon/>Nueva reserva</button></div>
  <div className="metric-grid">
   <article className="admin-metric"><span>Comensales</span><strong>{dashboardMetrics.covers}</strong><small>{dashboardMetrics.coversDelta}</small></article>
   <article className="admin-metric"><span>Reservas</span><strong>{dashboardMetrics.reservations}</strong><small>11 comida · 16 cena</small></article>
   <article className="admin-metric"><span>Ocupación prevista</span><strong>{dashboardMetrics.occupancy}%</strong><div className="metric-track"><i style={{width:`${dashboardMetrics.occupancy}%`}}/></div></article>
   <article className="admin-metric"><span>Lista de espera</span><strong>{dashboardMetrics.waitlist}</strong><small>2 candidatos compatibles</small></article>
  </div>
  <div className="dashboard-grid">
   <section className="admin-panel span-2"><div className="panel-head"><div><span className="admin-kicker">Próximas</span><h2>Reservas</h2></div><Link href="/admin/reservas">Ver todas</Link></div><div className="compact-reservations">{upcoming.map(r=><div className="compact-row" key={r.id}><time>{r.time}</time><div className="compact-person"><strong>{r.customer}</strong><small>{r.partySize} pax · {r.table??'mesa pendiente'}{r.notes?` · ${r.notes}`:''}</small></div><StatusPill status={r.status}/></div>)}</div></section>
   <section className="admin-panel"><div className="panel-head"><div><span className="admin-kicker">Semana</span><h2>Ocupación</h2></div><Link href="/admin/calendario">Calendario</Link></div><div className="week-strip">{weekDays.map(d=><div key={d.date} className={`${d.active?'active':''} ${d.closed?'closed':''}`}><span>{d.day}</span><strong>{d.date}</strong><small>{d.closed?'Cerrado':`${d.covers} pax`}</small></div>)}</div></section>
   <section className="admin-panel"><div className="panel-head"><div><span className="admin-kicker">Demanda</span><h2>Lista de espera</h2></div><span className="count-badge">{waitlist.length}</span></div><div className="waitlist-list">{waitlist.slice(0,4).map(w=><div key={w.id}><time>{w.time}</time><div><strong>{w.name}</strong><small>{w.party} pax · {w.flexibility}</small></div></div>)}</div></section>
   <section className="admin-panel span-2 service-balance"><div><span className="admin-kicker">Servicio</span><h2>Balance de capacidad</h2><p>La cena concentra la mayor presión entre 21:00 y 22:00. Dos reservas siguen sin mesa definitiva.</p></div><div className="capacity-bars"><div><span>Comida</span><strong>63%</strong><i><b style={{width:'63%'}}/></i></div><div><span>Cena</span><strong>82%</strong><i><b style={{width:'82%'}}/></i></div></div></section>
  </div>
 </div>
}
