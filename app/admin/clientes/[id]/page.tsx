import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRightIcon } from '@/components/admin/admin-icons';
import { CustomerMemoryEditor } from '@/components/admin/customer-memory-editor';
import { StatusPill } from '@/components/admin/status-pill';
import { requireStaffSession } from '@/lib/admin/auth';
import { dateLabel, loadCustomerDetail } from '@/lib/admin/overview-data';

export const dynamic = 'force-dynamic';

const sourceLabels = {
  website: 'Web', phone: 'Teléfono', walk_in: 'Recepción', admin: 'Control',
  instagram: 'Instagram', google: 'Google', other: 'Otro',
};

function fullDate(value: string) {
  return dateLabel(value.slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaffSession();
  const { id } = await params;
  const customer = await loadCustomerDetail(id);
  if (!customer) notFound();
  const canEditMemory = staff.role === 'manager' || staff.role === 'host';

  return <div className="admin-page customer-detail-page">
    <div className="admin-page-head customer-detail-head"><div><Link prefetch={false} href="/control/clientes" className="admin-back-link">Clientes /</Link><span className="admin-kicker"> Ficha automática</span><h1>{customer.name}</h1><p>{customer.phone ?? 'Sin teléfono'} · {customer.email ?? 'Sin email'}</p></div>{customer.activeReservations > 0 && <span className="customer-live-badge">{customer.activeReservations} {customer.activeReservations === 1 ? 'reserva activa' : 'reservas activas'}</span>}</div>
    <div className="customer-detail-metrics"><div><span>Reservas</span><strong>{customer.totalReservations}</strong></div><div><span>Visitas</span><strong>{customer.completedVisits}</strong></div><div><span>Cancelaciones</span><strong>{customer.cancellations}</strong></div><div className={customer.noShows ? 'attention' : ''}><span>No-shows</span><strong>{customer.noShows}</strong></div><div><span>Grupo habitual</span><strong>{customer.typicalPartySize ? `${customer.typicalPartySize} pax` : '—'}</strong></div></div>
    <div className="customer-detail-layout">
      <section className="admin-panel customer-history-panel"><div className="panel-head"><div><span className="admin-kicker">Cronología completa</span><h2>Historial de reservas</h2></div><span className="count-badge">{customer.history.length}</span></div>
        {customer.history.length ? <div className="customer-history">{customer.history.map((reservation) => <Link prefetch={false} href={`/control/reservas?reservation=${reservation.id}`} className="customer-history-link" key={reservation.id}><article><div className="customer-history-date"><strong>{fullDate(reservation.startsAt)}</strong><span>{new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(reservation.startsAt))}</span></div><div className="customer-history-main"><div><strong>{reservation.serviceName ?? 'Servicio'} · {reservation.partySize} pax</strong><small>{sourceLabels[reservation.source]} · {reservation.adults} adultos{reservation.children ? ` · ${reservation.children} niños` : ''}</small></div><StatusPill status={reservation.status}/>{(reservation.allergies || reservation.preferences || reservation.notes) && <p>{[reservation.allergies && `Alergias: ${reservation.allergies}`, reservation.preferences && `Preferencias: ${reservation.preferences}`, reservation.notes].filter(Boolean).join(' · ')}</p>}</div><ChevronRightIcon /></article></Link>)}</div> : <div className="admin-empty">Este cliente todavía no tiene reservas registradas.</div>}
      </section>
      <aside className="customer-profile-column">
        <CustomerMemoryEditor customerId={customer.id} initialAllergies={customer.allergies} initialPreferences={customer.preferences} initialNotes={customer.internalNotes} canEdit={canEditMemory} />
        <section className="admin-panel customer-lifecycle"><span className="admin-kicker">Relación</span><dl><div><dt>Primera visita</dt><dd>{customer.firstVisit ? fullDate(customer.firstVisit) : 'Sin completar'}</dd></div><div><dt>Última visita</dt><dd>{customer.lastVisit ? fullDate(customer.lastVisit) : 'Sin completar'}</dd></div><div><dt>Cliente desde</dt><dd>{fullDate(customer.createdAt)}</dd></div><div><dt>Comensales atendidos</dt><dd>{customer.totalCovers}</dd></div></dl></section>
      </aside>
    </div>
  </div>;
}
