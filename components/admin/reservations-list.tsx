'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { reservations as seedReservations, tables } from '@/lib/admin/mock-data';
import type { AdminReservation, ReservationStatus } from '@/lib/admin/types';
import {
  CheckIcon,
  ChevronRightIcon,
  CloseIcon,
  MailIcon,
  MoreIcon,
  PhoneIcon,
  PlusIcon,
  SearchIcon,
  TableIcon,
  UserIcon,
} from './admin-icons';
import { StatusPill } from './status-pill';

const sourceLabel: Record<AdminReservation['source'], string> = {
  website: 'Web',
  walk_in: 'Walk-in',
  phone: 'Teléfono',
  admin: 'Admin',
};

const statusOptions: Array<{ value: ReservationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'seated', label: 'Sentadas' },
];

const tableOptions = Array.from(
  new Set([
    ...tables.map((table) => table.label),
    ...seedReservations.map((reservation) => reservation.table).filter(Boolean),
  ]),
) as string[];

function reservationEnd(time: string, duration: number) {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + duration;
  const endHours = Math.floor(total / 60) % 24;
  const endMinutes = total % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

function nextPrimaryStatus(status: ReservationStatus): ReservationStatus | null {
  if (status === 'pending') return 'confirmed';
  if (status === 'confirmed') return 'seated';
  if (status === 'seated') return 'completed';
  return null;
}

function nextPrimaryLabel(status: ReservationStatus) {
  if (status === 'pending') return 'Confirmar reserva';
  if (status === 'confirmed') return 'Marcar como sentada';
  if (status === 'seated') return 'Completar visita';
  return '';
}

export function ReservationsList({ openCreateSignal = 0 }: { openCreateSignal?: number }) {
  const [items, setItems] = useState<AdminReservation[]>(seedReservations);
  const [query, setQuery] = useState('');
  const [service, setService] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    if (openCreateSignal > 0) setCreateOpen(true);
  }, [openCreateSignal]);

  const selected = items.find((item) => item.id === selectedId) ?? null;

  const filtered = useMemo(
    () =>
      items.filter((reservation) => {
        const normalizedQuery = query.trim().toLowerCase();
        const searchHit =
          !normalizedQuery ||
          reservation.customer.toLowerCase().includes(normalizedQuery) ||
          reservation.phone.includes(normalizedQuery) ||
          reservation.id.toLowerCase().includes(normalizedQuery);
        const hour = Number(reservation.time.slice(0, 2));
        const serviceHit = service === 'all' || (service === 'lunch' ? hour < 18 : hour >= 18);
        const statusHit = status === 'all' || reservation.status === status;
        return searchHit && serviceHit && statusHit;
      }),
    [items, query, service, status],
  );

  const metrics = useMemo(() => {
    const active = items.filter((item) => !['cancelled', 'completed', 'no_show'].includes(item.status));
    return {
      covers: active.reduce((sum, item) => sum + item.partySize, 0),
      pending: active.filter((item) => item.status === 'pending').length,
      seated: active.filter((item) => item.status === 'seated').reduce((sum, item) => sum + item.partySize, 0),
      unassigned: active.filter((item) => !item.table).length,
    };
  }, [items]);

  function patchReservation(id: string, patch: Partial<AdminReservation>) {
    setItems((current) => current.map((reservation) => (reservation.id === id ? { ...reservation, ...patch } : reservation)));
  }

  function createReservation(payload: Omit<AdminReservation, 'id' | 'visits'>) {
    const id = `R-${String(Math.max(...items.map((item) => Number(item.id.replace(/\D/g, '')) || 0)) + 1).padStart(4, '0')}`;
    const created: AdminReservation = { ...payload, id, visits: 0 };
    setItems((current) => [...current, created].sort((a, b) => a.time.localeCompare(b.time)));
    setCreateOpen(false);
    setSelectedId(id);
  }

  return (
    <>
      <section className="reservation-summary" aria-label="Resumen del servicio">
        <div><span>Comensales activos</span><strong>{metrics.covers}</strong></div>
        <div><span>Pendientes</span><strong>{metrics.pending}</strong></div>
        <div><span>Sentados ahora</span><strong>{metrics.seated}</strong></div>
        <div className={metrics.unassigned ? 'attention' : ''}><span>Sin mesa</span><strong>{metrics.unassigned}</strong></div>
      </section>

      <div className="admin-toolbar reservation-toolbar">
        <label className="admin-search">
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente, teléfono o reserva" />
        </label>
        <div className="toolbar-groups">
          <div className="segmented" aria-label="Servicio">
            <button className={service === 'all' ? 'active' : ''} onClick={() => setService('all')}>Todo el día</button>
            <button className={service === 'lunch' ? 'active' : ''} onClick={() => setService('lunch')}>Comida</button>
            <button className={service === 'dinner' ? 'active' : ''} onClick={() => setService('dinner')}>Cena</button>
          </div>
          <button className="admin-primary reservation-create-mobile" onClick={() => setCreateOpen(true)}><PlusIcon />Nueva</button>
        </div>
      </div>

      <div className="reservation-status-tabs" role="tablist" aria-label="Estado de reservas">
        {statusOptions.map((option) => (
          <button key={option.value} className={status === option.value ? 'active' : ''} onClick={() => setStatus(option.value)}>
            {option.label}
            {option.value !== 'all' && <span>{items.filter((item) => item.status === option.value).length}</span>}
          </button>
        ))}
      </div>

      <div className="reservation-table-wrap desktop-reservations">
        <table className="reservation-table">
          <thead><tr><th>Hora</th><th>Cliente</th><th>Mesa</th><th>Pax</th><th>Estado</th><th>Origen</th><th /></tr></thead>
          <tbody>
            {filtered.map((reservation) => (
              <tr key={reservation.id} onClick={() => setSelectedId(reservation.id)} className="reservation-row">
                <td><strong>{reservation.time}</strong><small>hasta {reservationEnd(reservation.time, reservation.duration)}</small></td>
                <td><strong>{reservation.customer}</strong><small>{reservation.phone}{reservation.allergies ? ' · ⚑ alergia' : ''}</small></td>
                <td><strong className={!reservation.table ? 'unassigned-text' : ''}>{reservation.table ?? 'Sin asignar'}</strong><small>{reservation.area}</small></td>
                <td><strong>{reservation.partySize}</strong><small>{reservation.children ? `${reservation.adults} ad. · ${reservation.children} ni.` : 'adultos'}</small></td>
                <td><StatusPill status={reservation.status} /></td>
                <td><span className="source-label">{sourceLabel[reservation.source]}</span></td>
                <td><button className="icon-button" onClick={(event) => { event.stopPropagation(); setSelectedId(reservation.id); }} aria-label={`Abrir ${reservation.id}`}><MoreIcon /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <div className="admin-empty">No hay reservas que coincidan con los filtros.</div>}
      </div>

      <div className="mobile-reservations">
        {filtered.map((reservation) => (
          <button className="mobile-reservation-card" key={reservation.id} onClick={() => setSelectedId(reservation.id)}>
            <div className="mobile-reservation-time"><strong>{reservation.time}</strong><small>{reservation.duration} min</small></div>
            <div className="mobile-reservation-body">
              <div className="mobile-reservation-title"><strong>{reservation.customer}</strong><StatusPill status={reservation.status} /></div>
              <p>{reservation.partySize} pax · {reservation.table ?? 'Sin mesa'} · {reservation.area}</p>
              {(reservation.allergies || reservation.notes) && <small>{reservation.allergies ? '⚑ Alergia registrada' : reservation.notes}</small>}
            </div>
            <ChevronRightIcon />
          </button>
        ))}
        {!filtered.length && <div className="admin-empty">No hay reservas que coincidan con los filtros.</div>}
      </div>

      {selected && (
        <ReservationDrawer
          key={selected.id}
          reservation={selected}
          onClose={() => setSelectedId(null)}
          onPatch={(patch) => patchReservation(selected.id, patch)}
        />
      )}

      {createOpen && <CreateReservationModal onClose={() => setCreateOpen(false)} onCreate={createReservation} />}
    </>
  );
}

function ReservationDrawer({
  reservation,
  onClose,
  onPatch,
}: {
  reservation: AdminReservation;
  onClose: () => void;
  onPatch: (patch: Partial<AdminReservation>) => void;
}) {
  const [note, setNote] = useState(reservation.internalNotes ?? '');
  const [cancelMode, setCancelMode] = useState(false);
  const primaryNext = nextPrimaryStatus(reservation.status);

  return (
    <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside className="reservation-drawer" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
        <header className="drawer-topbar">
          <div><span className="admin-kicker">{reservation.id}</span><p>{sourceLabel[reservation.source]} · {reservation.visits} visita{reservation.visits === 1 ? '' : 's'} previas</p></div>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
        </header>

        <div className="drawer-scroll">
          <section className="reservation-hero-card">
            <div className="reservation-hero-time"><strong>{reservation.time}</strong><span>{reservationEnd(reservation.time, reservation.duration)}</span></div>
            <div className="reservation-hero-person">
              <StatusPill status={reservation.status} />
              <h2 id="reservation-title">{reservation.customer}</h2>
              <p>{reservation.partySize} personas · {reservation.adults} adultos{reservation.children ? ` · ${reservation.children} niños` : ''}</p>
            </div>
          </section>

          <div className="reservation-contact-actions">
            <a href={`tel:${reservation.phone.replace(/\s/g, '')}`}><PhoneIcon /><span>Llamar</span></a>
            <button><MailIcon /><span>Confirmación</span></button>
            <button><UserIcon /><span>Cliente</span></button>
          </div>

          {reservation.allergies && (
            <section className="reservation-alert">
              <div><strong>Atención · alergia registrada</strong><p>{reservation.allergies}</p></div>
              <span>⚑</span>
            </section>
          )}

          <section className="drawer-section">
            <div className="drawer-section-head"><div><span className="admin-kicker">Servicio</span><h3>Mesa y estado</h3></div></div>
            <div className="reservation-field-grid">
              <label><span>Mesa asignada</span><div className="select-shell"><TableIcon /><select value={reservation.table ?? ''} onChange={(event) => onPatch({ table: event.target.value || null })}><option value="">Sin asignar</option>{tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}</select></div></label>
              <label><span>Zona</span><select className="drawer-select" value={reservation.area} onChange={(event) => onPatch({ area: event.target.value as AdminReservation['area'] })}><option>Terraza</option><option>Interior</option><option>Barra</option></select></label>
              <label><span>Duración estimada</span><select className="drawer-select" value={reservation.duration} onChange={(event) => onPatch({ duration: Number(event.target.value) })}><option value={90}>90 min</option><option value={105}>105 min</option><option value={120}>120 min</option><option value={135}>135 min</option></select></label>
              <label><span>Origen</span><div className="readonly-value">{sourceLabel[reservation.source]}</div></label>
            </div>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-head"><div><span className="admin-kicker">Cliente</span><h3>Información de la visita</h3></div></div>
            <dl className="reservation-details-list">
              <div><dt>Teléfono</dt><dd>{reservation.phone}</dd></div>
              <div><dt>Email</dt><dd>{reservation.email ?? 'No indicado'}</dd></div>
              <div><dt>Preferencias</dt><dd>{reservation.preferences ?? reservation.notes ?? 'Sin preferencias'}</dd></div>
              <div><dt>Historial</dt><dd>{reservation.visits ? `${reservation.visits} visitas anteriores · 0 no-shows` : 'Primera visita'}</dd></div>
            </dl>
          </section>

          <section className="drawer-section">
            <div className="drawer-section-head"><div><span className="admin-kicker">Solo equipo</span><h3>Notas internas</h3></div><span className="private-label">Privado</span></div>
            <textarea className="reservation-notes" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Añade contexto útil para sala, cocina o recepción…" />
            <button className="text-action" onClick={() => onPatch({ internalNotes: note })}>Guardar nota</button>
          </section>

          <section className="drawer-section status-section">
            <div className="drawer-section-head"><div><span className="admin-kicker">Flujo</span><h3>Estado de la reserva</h3></div></div>
            <div className="status-timeline">
              {(['confirmed', 'seated', 'completed'] as ReservationStatus[]).map((item, index) => {
                const order = ['pending', 'confirmed', 'seated', 'completed'];
                const active = order.indexOf(reservation.status) >= order.indexOf(item);
                return <div key={item} className={active ? 'done' : ''}><i>{active ? <CheckIcon /> : index + 1}</i><span>{item === 'confirmed' ? 'Confirmada' : item === 'seated' ? 'Sentada' : 'Completada'}</span></div>;
              })}
            </div>
          </section>
        </div>

        <footer className="drawer-actions">
          {!cancelMode ? (
            <>
              {primaryNext && <button className="admin-primary drawer-primary" onClick={() => onPatch({ status: primaryNext })}>{nextPrimaryLabel(reservation.status)}</button>}
              {reservation.status === 'confirmed' && <button className="admin-secondary" onClick={() => onPatch({ status: 'no_show' })}>No-show</button>}
              {!['cancelled', 'completed', 'no_show'].includes(reservation.status) && <button className="danger-link" onClick={() => setCancelMode(true)}>Cancelar reserva</button>}
            </>
          ) : (
            <div className="cancel-confirmation"><p><strong>¿Cancelar esta reserva?</strong><span>La mesa volverá a quedar disponible. La reserva se conserva en el historial.</span></p><div><button className="admin-secondary" onClick={() => setCancelMode(false)}>Volver</button><button className="danger-button" onClick={() => { onPatch({ status: 'cancelled' }); setCancelMode(false); }}>Confirmar cancelación</button></div></div>
          )}
        </footer>
      </aside>
    </div>
  );
}

function CreateReservationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (reservation: Omit<AdminReservation, 'id' | 'visits'>) => void }) {
  const [partySize, setPartySize] = useState(2);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const children = Number(data.get('children') || 0);
    const payload: Omit<AdminReservation, 'id' | 'visits'> = {
      time: String(data.get('time')),
      duration: Number(data.get('duration')),
      customer: String(data.get('customer')),
      phone: String(data.get('phone')),
      email: String(data.get('email') || ''),
      partySize,
      adults: Math.max(1, partySize - children),
      children,
      table: String(data.get('table') || '') || null,
      area: String(data.get('area')) as AdminReservation['area'],
      status: 'confirmed',
      source: String(data.get('source')) as AdminReservation['source'],
      notes: String(data.get('notes') || ''),
      preferences: String(data.get('preferences') || ''),
      internalNotes: String(data.get('internalNotes') || ''),
    };
    onCreate(payload);
  }

  return (
    <div className="admin-overlay modal-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="create-reservation-modal" role="dialog" aria-modal="true" aria-labelledby="create-reservation-title">
        <header className="drawer-topbar">
          <div><span className="admin-kicker">Nueva reserva</span><p>Entrada manual · disponibilidad simulada en modo desarrollo</p></div>
          <button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button>
        </header>
        <form onSubmit={submit}>
          <div className="create-scroll">
            <div className="create-intro"><h2 id="create-reservation-title">Añadir una mesa al servicio</h2><p>Para teléfono, recepción o reservas que entren directamente por el equipo.</p></div>
            <div className="create-form-section"><span className="admin-kicker">Reserva</span><div className="create-form-grid">
              <label><span>Hora</span><input name="time" type="time" defaultValue="21:00" required /></label>
              <label><span>Duración</span><select name="duration" defaultValue="105"><option value="90">90 min</option><option value="105">105 min</option><option value="120">120 min</option><option value="135">135 min</option></select></label>
              <label><span>Personas</span><input name="partySize" type="number" min="1" max="20" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))} required /></label>
              <label><span>Niños</span><input name="children" type="number" min="0" max={partySize} defaultValue="0" /></label>
              <label><span>Zona</span><select name="area" defaultValue="Terraza"><option>Terraza</option><option>Interior</option><option>Barra</option></select></label>
              <label><span>Mesa</span><select name="table" defaultValue=""><option value="">Asignar después</option>{tableOptions.map((table) => <option key={table} value={table}>{table}</option>)}</select></label>
            </div></div>
            <div className="create-form-section"><span className="admin-kicker">Cliente</span><div className="create-form-grid">
              <label className="span-2"><span>Nombre y apellidos</span><input name="customer" placeholder="Nombre del cliente" required /></label>
              <label><span>Teléfono</span><input name="phone" type="tel" placeholder="+34" required /></label>
              <label><span>Email</span><input name="email" type="email" placeholder="Opcional" /></label>
              <label><span>Origen</span><select name="source" defaultValue="phone"><option value="phone">Teléfono</option><option value="admin">Admin</option><option value="walk_in">Walk-in</option><option value="website">Web</option></select></label>
              <label><span>Preferencias</span><input name="preferences" placeholder="Terraza, trona…" /></label>
              <label className="span-2"><span>Notas del cliente</span><input name="notes" placeholder="Cumpleaños, ocasión especial…" /></label>
              <label className="span-2"><span>Nota interna</span><textarea name="internalNotes" placeholder="Solo visible para el equipo" /></label>
            </div></div>
          </div>
          <footer className="create-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit">Crear reserva</button></footer>
        </form>
      </section>
    </div>
  );
}
