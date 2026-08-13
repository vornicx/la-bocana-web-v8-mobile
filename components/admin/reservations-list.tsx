'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { AdminReservation, FloorSnapshot, ReservationStatus } from '@/lib/admin/types';
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
} from './admin-icons';
import { ControlSelect, DatePicker, NumberStepper } from './control-fields';
import { StatusPill } from './status-pill';
import { useDialogFocus } from './use-dialog-focus';

type AvailabilitySlot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };
type TableChoice = { key: string; name: string; tableIds: string[]; capacity: number; area: string };

const sourceLabel: Record<AdminReservation['source'], string> = {
  website: 'Web', phone: 'Teléfono', walk_in: 'Walk-in', admin: 'Admin', instagram: 'Instagram', google: 'Google', other: 'Otro',
};

const sourceOptions = [
  { value: 'phone', label: 'Teléfono', description: 'Reserva recibida por llamada' },
  { value: 'admin', label: 'Recepción / equipo', description: 'Creada manualmente en Control' },
  { value: 'instagram', label: 'Instagram', description: 'Conversación en redes sociales' },
  { value: 'google', label: 'Google', description: 'Contacto desde Google' },
  { value: 'other', label: 'Otro', description: 'Otro canal de entrada' },
];

const statusOptions: Array<{ value: ReservationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'confirmed', label: 'Confirmadas' },
  { value: 'seated', label: 'Sentadas' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'no_show', label: 'No-show' },
];

function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`));
}

function reservationEnd(time: string, duration: number) {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + duration;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function localTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
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

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
  return body;
}

export function ReservationsList({ initialSnapshot, canOperate, openCreateSignal = 0 }: { initialSnapshot: FloorSnapshot; canOperate: boolean; openCreateSignal?: number }) {
  const params = useSearchParams();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [query, setQuery] = useState('');
  const [serviceId, setServiceId] = useState<'all' | string>('all');
  const [status, setStatus] = useState<ReservationStatus | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('reservation'));
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { if (openCreateSignal > 0 && canOperate) setCreateOpen(true); }, [openCreateSignal, canOperate]);
  useEffect(() => {
    const requested = params.get('reservation');
    if (requested && snapshot.reservations.some((item) => item.id === requested)) setSelectedId(requested);
  }, [params, snapshot.reservations]);
  useEffect(() => {
    if (snapshot.date !== todayMadrid()) return;
    const interval = window.setInterval(() => { void refresh(snapshot.date, true); }, 30000);
    return () => window.clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.date]);

  const selected = snapshot.reservations.find((item) => item.id === selectedId) ?? null;
  const tableChoices = useMemo<TableChoice[]>(() => {
    const singles = snapshot.tables.map((table) => ({ key: `table:${table.id}`, name: table.label, tableIds: [table.id], capacity: table.seats, area: table.area }));
    const combos = snapshot.combinations.map((combo) => {
      const members = combo.tableIds.map((id) => snapshot.tables.find((table) => table.id === id)).filter(Boolean);
      return { key: `combo:${combo.id}`, name: combo.name, tableIds: combo.tableIds, capacity: combo.maxCapacity, area: members[0]?.area ?? 'Interior' };
    });
    return [...singles, ...combos].sort((a, b) => a.capacity - b.capacity || a.name.localeCompare(b.name));
  }, [snapshot.tables, snapshot.combinations]);

  const filtered = useMemo(() => snapshot.reservations.filter((reservation) => {
    const normalized = query.trim().toLowerCase();
    const searchHit = !normalized || [reservation.customer, reservation.phone, reservation.email, reservation.confirmationCode, reservation.id, reservation.table]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized));
    const serviceHit = serviceId === 'all' || reservation.serviceId === serviceId;
    const statusHit = status === 'all' || reservation.status === status;
    return searchHit && serviceHit && statusHit;
  }), [snapshot.reservations, query, serviceId, status]);

  const metrics = useMemo(() => {
    const active = snapshot.reservations.filter((item) => !['cancelled', 'completed', 'no_show'].includes(item.status));
    return {
      covers: active.reduce((sum, item) => sum + item.partySize, 0),
      arrivals: active.filter((item) => ['pending', 'confirmed'].includes(item.status)).length,
      seated: active.filter((item) => item.status === 'seated').reduce((sum, item) => sum + item.partySize, 0),
      unassigned: active.filter((item) => !(item.tableIds?.length)).length,
    };
  }, [snapshot.reservations]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function refresh(date = snapshot.date, quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const next = await parseResponse(await fetch(`/api/admin/floor?date=${encodeURIComponent(date)}`, { cache: 'no-store' })) as FloorSnapshot;
      setSnapshot(next);
      setSelectedId((current) => current && next.reservations.some((item) => item.id === current) ? current : null);
      if (serviceId !== 'all' && !next.services.some((service) => service.id === serviceId)) setServiceId('all');
      return next;
    } catch (error) {
      if (!quiet) flash((error as Error).message);
      throw error;
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function changeDate(date: string) {
    if (loading) return;
    setSelectedId(null);
    try { await refresh(date); } catch { /* toast */ }
  }

  async function perform(path: string, payload: Record<string, unknown>, success: string) {
    if (loading) return;
    setLoading(true);
    try {
      await parseResponse(await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      await refresh(snapshot.date, true);
      flash(success);
    } catch (error) {
      flash((error as Error).message);
      throw error;
    } finally { setLoading(false); }
  }

  async function transition(reservationId: string, next: ReservationStatus) {
    await perform('/api/admin/floor/status', { reservationId, status: next }, next === 'confirmed' ? 'Reserva confirmada.' : next === 'seated' ? 'Mesa marcada como sentada.' : next === 'completed' ? 'Visita completada.' : next === 'no_show' ? 'Marcada como no-show.' : 'Reserva cancelada.');
  }

  async function assign(reservationId: string, choiceKey: string) {
    if (!choiceKey) return perform('/api/admin/reservations/unassign', { reservationId }, 'Reserva sin mesa asignada.');
    const choice = tableChoices.find((item) => item.key === choiceKey);
    if (!choice) throw new Error('Selección de mesa inválida.');
    return perform('/api/admin/floor/assign', { reservationId, tableIds: choice.tableIds }, `Mesa actualizada: ${choice.name}.`);
  }

  async function saveNotes(reservation: AdminReservation, values: { notes: string; preferences: string; allergies: string; internalNotes: string }) {
    await perform('/api/admin/reservations/notes', { reservationId: reservation.id, ...values }, 'Información de la reserva guardada.');
  }

  async function created(reservationId: string) {
    await refresh(snapshot.date, true);
    setSelectedId(reservationId);
    setCreateOpen(false);
    flash('Reserva creada y mesa retenida correctamente.');
  }

  return <>
    <section className="reservation-commandbar premium-reservation-commandbar">
      <div className="reservation-date-control bespoke-reservation-date">
        <button aria-label="Día anterior" onClick={() => changeDate(shiftDate(snapshot.date, -1))}>‹</button>
        <div><span>{snapshot.date === todayMadrid() ? 'Hoy' : 'Servicio'}</span><strong>{dateLabel(snapshot.date)}</strong></div>
        <button aria-label="Día siguiente" onClick={() => changeDate(shiftDate(snapshot.date, 1))}>›</button>
        <div className="reservation-date-picker"><DatePicker value={snapshot.date} onChange={(value) => void changeDate(value)} ariaLabel="Ir a una fecha" /></div>
        {snapshot.date !== todayMadrid() && <button className="reservation-today" onClick={() => changeDate(todayMadrid())}>Hoy</button>}
      </div>
      <div className="reservation-live"><i/><span>{loading ? 'Actualizando…' : 'Supabase en vivo'}</span></div>
    </section>

    <section className="reservation-summary premium-reservation-summary" aria-label="Resumen del servicio">
      <div><span>Cubiertos activos</span><strong>{metrics.covers}</strong><small>pendientes + sentados</small></div>
      <div><span>Por llegar</span><strong>{metrics.arrivals}</strong><small>reservas activas</small></div>
      <div><span>Sentados ahora</span><strong>{metrics.seated}</strong><small>comensales en mesa</small></div>
      <div className={metrics.unassigned ? 'attention' : ''}><span>Sin mesa</span><strong>{metrics.unassigned}</strong><small>{metrics.unassigned ? 'requieren acción' : 'todo asignado'}</small></div>
    </section>

    <div className="admin-toolbar reservation-toolbar premium-reservation-toolbar">
      <label className="admin-search"><SearchIcon/><span className="sr-only">Buscar reservas</span><input aria-label="Buscar reservas por cliente, teléfono, código o mesa" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, teléfono, código o mesa"/></label>
      <div className="toolbar-groups">
        <div className="segmented reservation-services" aria-label="Servicio">
          <button className={serviceId === 'all' ? 'active' : ''} onClick={() => setServiceId('all')}>Todo</button>
          {snapshot.services.map((service) => <button key={service.id} className={serviceId === service.id ? 'active' : ''} onClick={() => setServiceId(service.id)}>{service.name}</button>)}
        </div>
        <button className="admin-primary reservation-create-mobile" disabled={!canOperate} onClick={() => setCreateOpen(true)}><PlusIcon/>Nueva</button>
      </div>
    </div>

    <div className="reservation-status-tabs premium-status-tabs" role="tablist" aria-label="Estado de reservas">
      {statusOptions.map((option) => <button key={option.value} className={status === option.value ? 'active' : ''} onClick={() => setStatus(option.value)}>{option.label}{option.value !== 'all' && <span>{snapshot.reservations.filter((item) => item.status === option.value).length}</span>}</button>)}
    </div>

    {filtered.length === 0 ? (
      <section className="admin-panel reservation-empty"><strong>Sin reservas en esta vista</strong><p>Ajusta los filtros o crea una nueva reserva para este servicio.</p></section>
    ) : (
      <>
        <div className="reservation-table-wrap desktop-reservations"><table className="reservation-table"><thead><tr><th>Hora</th><th>Cliente</th><th>Pax</th><th>Origen</th><th>Mesa</th><th>Estado</th><th aria-label="Acciones" /></tr></thead><tbody>{filtered.map((reservation) => <ReservationRow key={reservation.id} reservation={reservation} onOpen={() => setSelectedId(reservation.id)} />)}</tbody></table></div>
        <div className="mobile-reservations">{filtered.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} onOpen={() => setSelectedId(reservation.id)} />)}</div>
      </>
    )}

    {selected && <ReservationDrawer reservation={selected} tableChoices={tableChoices} canOperate={canOperate} loading={loading} onClose={() => setSelectedId(null)} onTransition={transition} onAssign={assign} onSaveNotes={saveNotes} />}
    {createOpen && <CreateReservationModal date={snapshot.date} canOperate={canOperate} loading={loading} onClose={() => setCreateOpen(false)} onCreated={created} />}
    {toast && <div className="admin-toast" role="status">{toast}</div>}
  </>;
}

function ReservationRow({ reservation, onOpen }: { reservation: AdminReservation; onOpen: () => void }) {
  return <tr onClick={onOpen} tabIndex={0} role="button" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(); } }}>
    <td><strong>{reservation.time}</strong><small>{reservationEnd(reservation.time, reservation.durationMinutes)}</small></td>
    <td><strong>{reservation.customer}</strong><small>{reservation.confirmationCode}</small></td>
    <td>{reservation.partySize}</td><td><span className="source-label">{sourceLabel[reservation.source]}</span></td>
    <td>{reservation.table ?? <span className="unassigned">Sin mesa</span>}</td><td><StatusPill status={reservation.status}/></td><td><button className="icon-button" aria-label={`Abrir reserva de ${reservation.customer}`} onClick={(event) => { event.stopPropagation(); onOpen(); }}><ChevronRightIcon/></button></td>
  </tr>;
}

function ReservationCard({ reservation, onOpen }: { reservation: AdminReservation; onOpen: () => void }) {
  return <button className="reservation-card" onClick={onOpen}><span className="reservation-card-time">{reservation.time}</span><span><strong>{reservation.customer}</strong><small>{reservation.partySize} pax · {reservation.table ?? 'Sin mesa'}</small></span><StatusPill status={reservation.status}/><ChevronRightIcon/></button>;
}

function ReservationDrawer({ reservation, tableChoices, canOperate, loading, onClose, onTransition, onAssign, onSaveNotes }: { reservation: AdminReservation; tableChoices: TableChoice[]; canOperate: boolean; loading: boolean; onClose: () => void; onTransition: (id: string, status: ReservationStatus) => Promise<void>; onAssign: (id: string, tableId: string) => Promise<void>; onSaveNotes: (reservation: AdminReservation, values: { notes: string; preferences: string; allergies: string; internalNotes: string }) => Promise<void> }) {
  const [notes, setNotes] = useState(reservation.notes ?? '');
  const [preferences, setPreferences] = useState(reservation.preferences ?? '');
  const [allergies, setAllergies] = useState(reservation.allergies ?? '');
  const [internalNotes, setInternalNotes] = useState(reservation.internalNotes ?? '');
  const [dirty, setDirty] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const next = nextPrimaryStatus(reservation.status);
  const currentTableKey = reservation.tableIds?.length === 1 ? `table:${reservation.tableIds[0]}` : tableChoices.find((item) => item.tableIds.length > 1 && item.tableIds.every((id) => reservation.tableIds?.includes(id)))?.key ?? '';
  const communication = reservation.communication;
  useEffect(() => { setNotes(reservation.notes ?? ''); setPreferences(reservation.preferences ?? ''); setAllergies(reservation.allergies ?? ''); setInternalNotes(reservation.internalNotes ?? ''); setDirty(false); }, [reservation]);

  return <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside ref={dialogRef} className="reservation-drawer" role="dialog" aria-modal="true" aria-label={`Reserva de ${reservation.customer}`}>
    <header><div><span className="admin-kicker">Reserva {reservation.confirmationCode}</span><h2>{reservation.customer}</h2><p>{reservation.service} · {reservation.time}–{reservationEnd(reservation.time, reservation.durationMinutes)}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><CloseIcon/></button></header>
    <section className="reservation-identity"><div><small>Comensales</small><strong>{reservation.partySize}</strong></div><div><small>Estado</small><StatusPill status={reservation.status}/></div><div><small>Mesa</small><strong>{reservation.table ?? 'Sin mesa'}</strong></div><div><small>Origen</small><strong>{sourceLabel[reservation.source]}</strong></div></section>
    <section className="drawer-section"><span className="section-label">Contacto</span><div className="contact-actions"><a href={`tel:${reservation.phone}`}><PhoneIcon/>Llamar</a>{reservation.phone && <a href={`https://wa.me/${reservation.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><PhoneIcon/>WhatsApp</a>}<a href={`mailto:${reservation.email}`}><MailIcon/>Email</a></div><p>{reservation.phone || 'Sin teléfono'} · {reservation.email || 'Sin email'}</p></section>
    <section className="drawer-section"><span className="section-label">Mesa y operación</span><label>Mesa asignada<ControlSelect value={currentTableKey} ariaLabel="Mesa asignada" options={[{ value: '', label: 'Sin mesa asignada' }, ...tableChoices.map((choice) => ({ value: choice.key, label: choice.name, description: `${choice.area} · ${choice.capacity} pax` }))]} disabled={!canOperate || loading} onChange={(value) => onAssign(reservation.id, value)} /></label>{!reservation.table && <Link prefetch={false} href="/control/sala" className="text-action"><TableIcon/>Abrir en Sala</Link>}</section>
    {(reservation.allergies || reservation.preferences) && <section className="drawer-alerts">{reservation.allergies && <div><strong>Alergias / restricciones</strong><p>{reservation.allergies}</p></div>}{reservation.preferences && <div><strong>Preferencias</strong><p>{reservation.preferences}</p></div>}</section>}
    <section className="drawer-section"><span className="section-label">Notas de servicio</span><label>Observaciones del cliente<textarea value={notes} maxLength={1500} onChange={(event) => { setNotes(event.target.value); setDirty(true); }}/></label><label>Preferencias<textarea value={preferences} maxLength={1000} onChange={(event) => { setPreferences(event.target.value); setDirty(true); }}/></label><label>Alergias<textarea value={allergies} maxLength={1000} onChange={(event) => { setAllergies(event.target.value); setDirty(true); }}/></label><label>Nota interna<textarea value={internalNotes} maxLength={1500} onChange={(event) => { setInternalNotes(event.target.value); setDirty(true); }}/></label><button className="admin-secondary" disabled={!dirty || loading || !canOperate} onClick={async () => { await onSaveNotes(reservation, { notes, preferences, allergies, internalNotes }); setDirty(false); }}>Guardar notas</button></section>
    <section className="drawer-section customer-memory"><span className="section-label">Memoria de cliente</span><div className="memory-grid"><div><strong>{reservation.visits}</strong><small>visitas completadas</small></div><div><strong>{reservation.cancellations}</strong><small>cancelaciones</small></div><div><strong>{reservation.noShows}</strong><small>no-shows</small></div><div><strong>{reservation.preferredPartySize ?? reservation.partySize}</strong><small>pax habitual</small></div></div>{reservation.lastVisit && <p>Última visita · {new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(reservation.lastVisit))}</p>}</section>
    {communication && <section className="drawer-section communication-state"><span className="section-label">Comunicaciones</span><p>{communication.status === 'failed' ? 'La última comunicación falló.' : communication.status === 'pending' ? 'Hay una comunicación pendiente de envío.' : communication.status === 'sent' ? 'Última comunicación enviada.' : 'Sin comunicaciones recientes.'}</p><small>{communication.template ?? 'Sin plantilla'} · {communication.channel ?? 'sin canal'}{communication.createdAt ? ` · ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(communication.createdAt))}` : ''}</small></section>}
    {canOperate && <footer>{next && <button className="admin-primary" disabled={loading} onClick={() => onTransition(reservation.id, next)}><CheckIcon/>{nextPrimaryLabel(reservation.status)}</button>}{['pending','confirmed'].includes(reservation.status) && <button className="admin-secondary" disabled={loading} onClick={() => onTransition(reservation.id, 'no_show')}>No-show</button>}{!['cancelled','completed','no_show'].includes(reservation.status) && <button className="danger-button" disabled={loading} onClick={() => onTransition(reservation.id, 'cancelled')}>Cancelar reserva</button>}</footer>}
  </aside></div>;
}

function CreateReservationModal({ date, canOperate, loading, onClose, onCreated }: { date: string; canOperate: boolean; loading: boolean; onClose: () => void; onCreated: (reservationId: string) => Promise<void> }) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState('phone');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slot, setSlot] = useState('');
  const [availabilityError, setAvailabilityError] = useState('');
  const [checking, setChecking] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);

  useEffect(() => { let active = true; async function load() { setChecking(true); setAvailabilityError(''); try { const response = await fetch(`/api/reservations/availability?date=${date}&adults=${adults}&children=${children}`); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'No se pudo consultar disponibilidad.'); if (!active) return; setSlots(body.slots || []); setSlot((current) => body.slots?.some((item: AvailabilitySlot) => item.startsAt === current) ? current : body.slots?.[0]?.startsAt ?? ''); } catch (error) { if (active) { setAvailabilityError((error as Error).message); setSlots([]); setSlot(''); } } finally { if (active) setChecking(false); } } void load(); return () => { active = false; }; }, [date, adults, children]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canOperate || loading || !slot) return;
    const data = new FormData(event.currentTarget);
    const selected = slots.find((item) => item.startsAt === slot);
    if (!selected) return;
    const response = await fetch('/api/admin/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serviceId: selected.serviceId, startsAt: selected.startsAt, adults, children, source, firstName: data.get('firstName'), lastName: data.get('lastName'), phone: data.get('phone'), email: data.get('email'), allergies: data.get('allergies'), preferences: data.get('preferences'), notes: data.get('notes') }) });
    const body = await parseResponse(response);
    await onCreated(body.reservation.id);
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={dialogRef} className="admin-modal new-reservation-modal" role="dialog" aria-modal="true" aria-label="Nueva reserva"><header><div><span className="admin-kicker">Alta manual</span><h2>Nueva reserva</h2><p>{dateLabel(date)}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><CloseIcon/></button></header><form onSubmit={submit}><div className="form-grid two"><label>Adultos<NumberStepper value={adults} onChange={setAdults} min={1} max={20} ariaLabel="Adultos" /></label><label>Niños<NumberStepper value={children} onChange={setChildren} min={0} max={12} ariaLabel="Niños" /></label></div><label>Origen<ControlSelect value={source} onChange={setSource} options={sourceOptions} ariaLabel="Origen de la reserva" /></label><div className="form-grid two"><label>Nombre<input name="firstName" required maxLength={120}/></label><label>Apellidos<input name="lastName" required maxLength={120}/></label></div><div className="form-grid two"><label>Teléfono<input name="phone" required maxLength={40}/></label><label>Email<input name="email" type="email" maxLength={254}/></label></div><label>Hora disponible<ControlSelect value={slot} onChange={setSlot} disabled={checking} ariaLabel="Hora disponible" options={slots.map((item) => ({ value: item.startsAt, label: `${item.serviceName} · ${localTime(item.startsAt)}`, description: `${item.durationMinutes} min` }))} placeholder={checking ? 'Consultando disponibilidad…' : 'Sin huecos disponibles'} /></label>{availabilityError && <p className="form-error" role="alert">{availabilityError}</p>}<label>Alergias<input name="allergies" maxLength={1000}/></label><label>Preferencias<input name="preferences" maxLength={1000}/></label><label>Notas<textarea name="notes" rows={3} maxLength={1500}/></label><footer><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" disabled={!slot || checking || loading || !canOperate}>{loading ? 'Creando…' : 'Crear reserva'}</button></footer></form></div></div>;
}
