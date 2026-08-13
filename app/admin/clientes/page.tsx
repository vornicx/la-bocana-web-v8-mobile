import Link from 'next/link';
import { ChevronRightIcon } from '@/components/admin/admin-icons';
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
    <div className="admin-page-head">
      <div><span className="admin-kicker">Historial de servicio</span><h1>Clientes</h1><p>Contacto, visitas, hábitos y notas útiles construidos desde reservas reales.</p></div>
    </div>

    <div className="crm-summary" aria-label="Resumen de clientes">
      <div><span>Clientes</span><strong>{customers.length}</strong><small>Perfiles consolidados</small></div>
      <div><span>Visitas completadas</span><strong>{totals.visits}</strong><small>Servicios finalizados</small></div>
      <div><span>Próximas activas</span><strong>{totals.active}</strong><small>Reservas en curso</small></div>
      <div className={totals.noShows ? 'attention' : ''}><span>No-shows</span><strong>{totals.noShows}</strong><small>Seguimiento operativo</small></div>
    </div>

    {customers.length ? <section className="customer-directory" aria-label="Directorio de clientes">
      <header><span>Cliente</span><span>Actividad</span><span>Contexto</span><span aria-hidden="true" /></header>
      <div>
        {customers.map((customer) => <Link className="customer-directory-row" key={customer.id} href={`/control/clientes/${customer.id}`}>
          <div className="customer-directory-identity">
            <span className="customer-initials">{initials(customer.name)}</span>
            <div><strong>{customer.name}</strong><small>{customer.phone ?? customer.email ?? 'Sin datos de contacto'}</small></div>
          </div>
          <div className="customer-directory-activity">
            <strong>{customer.completedVisits}</strong>
            <span>{customer.totalReservations} reservas · {customer.activeReservations} activas</span>
          </div>
          <div className="customer-directory-context">
            <div>{customer.typicalPartySize ? <span>{customer.typicalPartySize} pax habitual</span> : <span>Sin patrón todavía</span>}{customer.allergies && <strong>ALERGIA</strong>}</div>
            <small>{customer.lastVisit ? `Última visita · ${dateLabel(customer.lastVisit.slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Sin visitas completadas'}{customer.cancellations || customer.noShows ? ` · ${customer.cancellations} cancelaciones · ${customer.noShows} no-shows` : ''}</small>
          </div>
          <ChevronRightIcon />
        </Link>)}
      </div>
    </section> : <div className="admin-panel crm-empty"><span className="admin-kicker">Clientes</span><h2>Sin perfiles todavía</h2><p>Los clientes aparecerán automáticamente cuando entren reservas reales.</p></div>}
  </div>;
}
