import { requireStaffSession } from '@/lib/admin/auth';
import { dateLabel, loadCustomersData } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'LB';
}

export default async function CustomersPage() {
  await requireStaffSession();
  const customers = await loadCustomersData();
  return <div className="admin-page"><div className="admin-page-head"><div><span className="admin-kicker">Mini CRM · datos reales</span><h1>Clientes</h1><p>Historial, preferencias y alertas consolidadas desde las reservas.</p></div></div>
    {customers.length ? <div className="customer-grid">{customers.map((customer) => <article className="customer-card" key={customer.id}><div className="customer-initials">{initials(customer.name)}</div><div><h3>{customer.name}</h3><p>{customer.phone ?? customer.email ?? 'Sin datos de contacto'}</p><div className="customer-meta"><span>{customer.visits} {customer.visits === 1 ? 'visita' : 'visitas'}</span><span>{customer.allergies ? 'Alergia registrada' : 'Sin alertas'}</span></div>{customer.lastVisit && <small>Última visita · {dateLabel(String(customer.lastVisit).slice(0, 10), { day: 'numeric', month: 'short', year: 'numeric' })}</small>}{(customer.preferences || customer.internalNotes) && <small>{customer.preferences ?? customer.internalNotes}</small>}</div></article>)}</div> : <div className="admin-panel crm-empty"><span className="admin-kicker">CRM preparado</span><h2>Aún no hay clientes reales.</h2><p>El primer cliente aparecerá aquí automáticamente cuando se confirme una reserva, sin cargar datos de demostración.</p></div>}
  </div>;
}
