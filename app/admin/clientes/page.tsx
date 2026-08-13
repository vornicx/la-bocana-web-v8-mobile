import Link from 'next/link';
import { requireStaffSession } from '@/lib/admin/auth';
import { dateLabel, loadCustomersData } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LB';
}

export default async function CustomersPage() {
  await requireStaffSession();
  const customers = await loadCustomersData();
  const totals = customers.reduce((acc, customer) => ({
    visits: acc.visits + customer.completedVisits,
    active: acc.active + customer.activeReservations,
    noShows: acc.noShows + customer.noShows,
  }), { visits: 0, active: 0, noShows: 0 });

  return <div className="admin-page crm-page">
    <div className="admin-page-head"><div><span className="admin-kicker">CRM automático · memoria de servicio</span><h1>Clientes</h1><p>Cada reserva construye contexto útil para recibir mejor al cliente en su siguiente visita.</p></div></div>
    <div className="crm-summary"><div><span>Clientes</span><strong>{customers.length}</strong><small>Perfiles consolidados</small></div><div><span>Visitas completadas</span><strong>{totals.visits}</strong><small>Servicios finalizados</small></div><div><span>Próximas activas</span><strong>{totals.active}</strong><small>Pendientes, confirmadas o sentados</small></div><div className={totals.noShows ? 'attention' : ''}><span>No-shows</span><strong>{totals.noShows}</strong><small>Seguimiento operativo</small></div></div>
    {customers.length ? <div className="customer-grid">{customers.map((customer) => <Link className="customer-card" key={customer.id} href={`/control/clientes/${customer.id}`}><div className="customer-initials">{initials(customer.name)}</div><div className="customer-card-body"><div className="customer-card-title"><div><h3>{customer.name}</h3><p>{customer.phone ?? customer.email ?? 'Sin datos de contacto'}</p></div><span>Ver ficha</span></div><div className="customer-meta"><span>{customer.totalReservations} reservas</span><span>{customer.completedVisits} visitas</span><span>{customer.typicalPartySize ? `${customer.typicalPartySize} pax habitual` : 'Sin patrón aún'}</span>{customer.allergies && <span className="customer-alert">Alergia registrada</span>}</div><div className="customer-outcomes"><small>{customer.cancellations} cancelaciones</small><small>{customer.noShows} no-shows</small>{customer.lastVisit ? <small>Última visita · {dateLabel(customer.lastVisit.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</small> : <small>Sin visitas completadas</small>}</div></div></Link>)}</div> : <div className="admin-panel crm-empty"><span className="admin-kicker">CRM preparado</span><h2>El historial empieza con la primera reserva.</h2><p>Los perfiles aparecerán aquí automáticamente a medida que entren clientes reales, sin cargar datos artificiales.</p></div>}
  </div>;
}
