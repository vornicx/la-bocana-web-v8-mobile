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
  UserIcon,
} from './admin-icons';
import { StatusPill } from './status-pill';
import { useDialogFocus } from './use-dialog-focus';

type AvailabilitySlot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };
type TableChoice = { key: string; name: string; tableIds: string[]; capacity: number; area: string };

const sourceLabel: Record<AdminReservation['source'], string> = {
  website: 'Web', phone: 'Teléfono', walk_in: 'Walk-in', admin: 'Admin', instagram: 'Instagram', google: 'Google', other: 'Otro',
};

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
      <div className="reservation-date-control">
        <button aria-label="Día anterior" onClick={() => changeDate(shiftDate(snapshot.date, -1))}>‹</button>
        <div><span>{snapshot.date === todayMadrid() ? 'Hoy' : 'Servicio'}</span><strong>{dateLabel(snapshot.date)}</strong></div>
        <button aria-label="Día siguiente" onClick={() => changeDate(shiftDate(snapshot.date, 1))}>›</button>
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
      <label className="admin-search"><SearchIcon/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cliente, teléfono, código o mesa"/></label>
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

    <div className="reservation-table-wrap desktop-reservations premium-reservation-table-wrap">
      <table className="reservation-table premium-reservation-table"><thead><tr><th>Hora</th><th>Cliente</th><th>Mesa</th><th>Pax</th><th>Estado</th><th>Origen</th><th/></tr></thead><tbody>
        {filtered.map((reservation) => <tr key={reservation.id} onClick={() => setSelectedId(reservation.id)} className="reservation-row">
          <td><strong>{reservation.time}</strong><small>hasta {reservationEnd(reservation.time, reservation.duration)}</small></td>
          <td><strong>{reservation.customer}</strong><small>{reservation.phone}{reservation.allergies ? ' · alergia registrada' : ''}</small></td>
          <td><strong className={!reservation.table ? 'unassigned-text' : ''}>{reservation.table ?? 'Sin asignar'}</strong><small>{reservation.area}</small></td>
          <td><strong>{reservation.partySize}</strong><small>{reservation.children ? `${reservation.adults} ad. · ${reservation.children} ni.` : `${reservation.adults} adultos`}</small></td>
          <td><StatusPill status={reservation.status}/></td><td><span className="source-label">{sourceLabel[reservation.source]}</span></td>
          <td><button className="icon-button" onClick={(event) => { event.stopPropagation(); setSelectedId(reservation.id); }} aria-label="Abrir reserva"><MoreIcon/></button></td>
        </tr>)}
      </tbody></table>
      {!filtered.length && <div className="admin-empty premium-empty">No hay reservas que coincidan con esta vista.</div>}
    </div>

    <div className="mobile-reservations">
      {filtered.map((reservation) => <button className="mobile-reservation-card premium-mobile-reservation" key={reservation.id} onClick={() => setSelectedId(reservation.id)}><div className="mobile-reservation-time"><strong>{reservation.time}</strong><small>{reservation.duration} min</small></div><div className="mobile-reservation-body"><div className="mobile-reservation-title"><strong>{reservation.customer}</strong><StatusPill status={reservation.status}/></div><p>{reservation.partySize} pax · {reservation.table ?? 'Sin mesa'} · {sourceLabel[reservation.source]}</p>{(reservation.allergies || reservation.internalNotes) && <small>{reservation.allergies ? 'Alergia registrada' : 'Nota interna registrada'}</small>}</div><ChevronRightIcon/></button>)}
      {!filtered.length && <div className="admin-empty">No hay reservas que coincidan con esta vista.</div>}
    </div>

    <section className="reservation-footnote"><span><i/>Datos reales</span><p>La disponibilidad, asignación y estados comparten el mismo motor que Sala. Las capacidades y distribución física siguen siendo QA hasta validar el plano definitivo del restaurante.</p></section>

    {selected && <ReservationDrawer key={`${selected.id}:${selected.status}:${selected.table ?? ''}:${selected.internalNotes ?? ''}`} reservation={selected} choices={tableChoices} canOperate={canOperate} loading={loading} onClose={() => setSelectedId(null)} onTransition={transition} onAssign={assign} onSaveNotes={saveNotes}/>}
    {createOpen && <CreateReservationModal date={snapshot.date} loading={loading} onClose={() => setCreateOpen(false)} onCreated={created}/>}
    {toast && <div className="admin-toast" role="status">{toast}</div>}
  </>;
}

function ReservationDrawer({ reservation, choices, canOperate, loading, onClose, onTransition, onAssign, onSaveNotes }: {
  reservation: AdminReservation; choices: TableChoice[]; canOperate: boolean; loading: boolean; onClose: () => void;
  onTransition: (id: string, status: ReservationStatus) => Promise<void>; onAssign: (id: string, key: string) => Promise<void>;
  onSaveNotes: (reservation: AdminReservation, values: { notes: string; preferences: string; allergies: string; internalNotes: string }) => Promise<void>;
}) {
  const [cancelMode, setCancelMode] = useState(false);
  const [notes, setNotes] = useState(reservation.notes ?? '');
  const [preferences, setPreferences] = useState(reservation.preferences ?? '');
  const [allergies, setAllergies] = useState(reservation.allergies ?? '');
  const [internalNotes, setInternalNotes] = useState(reservation.internalNotes ?? '');
  const dialogRef = useDialogFocus<HTMLElement>(onClose);
  const primaryNext = nextPrimaryStatus(reservation.status);
  const currentChoice = choices.find((choice) => {
    const current = [...(reservation.tableIds ?? [])].sort().join('|');
    return [...choice.tableIds].sort().join('|') === current;
  })?.key ?? '';

  return <div className="admin-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <aside ref={dialogRef} className="reservation-drawer premium-reservation-drawer" role="dialog" aria-modal="true" aria-labelledby="reservation-title" tabIndex={-1}>
      <header className="drawer-topbar"><div><span className="admin-kicker">{reservation.confirmationCode ?? 'Reserva'}</span><p>{sourceLabel[reservation.source]} · {reservation.visits ? `${Math.max(0, reservation.visits - 1)} visitas previas` : 'Primera visita'}</p></div><button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon/></button></header>
      <div className="drawer-scroll">
        <section className="reservation-hero-card premium-reservation-hero"><div className="reservation-hero-time"><strong>{reservation.time}</strong><span>hasta {reservationEnd(reservation.time, reservation.duration)}</span></div><div className="reservation-hero-person"><StatusPill status={reservation.status}/><h2 id="reservation-title">{reservation.customer}</h2><p>{reservation.partySize} personas · {reservation.adults} adultos{reservation.children ? ` · ${reservation.children} niños` : ''}</p></div></section>

        <div className="reservation-contact-actions">
          {reservation.phone !== 'Sin teléfono' ? <a href={`tel:${reservation.phone.replace(/\s/g, '')}`}><PhoneIcon/><span>Llamar</span></a> : <span className="contact-disabled"><PhoneIcon/><small>Sin teléfono</small></span>}
          {reservation.email ? <a href={`mailto:${reservation.email}`}><MailIcon/><span>Email</span></a> : <span className="contact-disabled"><MailIcon/><small>Sin email</small></span>}
          <Link href="/admin/sala"><TableIcon/><span>Ver sala</span></Link>
        </div>

        {reservation.allergies && <section className="reservation-alert"><div><strong>Atención · alergia registrada</strong><p>{reservation.allergies}</p></div><span aria-hidden="true">AL</span></section>}

        <section className="drawer-section premium-drawer-section"><div className="drawer-section-head"><div><span className="admin-kicker">Servicio</span><h3>Mesa y operación</h3></div></div><div className="reservation-field-grid">
          <label><span>Mesa asignada</span><div className="select-shell"><TableIcon/><select disabled={!canOperate || loading || ['completed','cancelled','no_show'].includes(reservation.status)} value={currentChoice} onChange={(event) => void onAssign(reservation.id, event.target.value)}><option value="">Sin asignar</option>{choices.filter((choice) => choice.capacity >= reservation.partySize).map((choice) => <option key={choice.key} value={choice.key}>{choice.name} · {choice.capacity} pax</option>)}</select></div></label>
          <label><span>Zona</span><div className="readonly-value">{reservation.table ? reservation.area : 'Pendiente de asignación'}</div></label>
          <label><span>Duración estimada</span><div className="readonly-value">{reservation.duration} min</div></label>
          <label><span>Origen</span><div className="readonly-value">{sourceLabel[reservation.source]}</div></label>
        </div></section>

        <section className="drawer-section premium-drawer-section"><div className="drawer-section-head"><div><span className="admin-kicker">Cliente</span><h3>Información de la visita</h3></div>{reservation.customerId && <span className="private-label">CRM</span>}</div><dl className="reservation-details-list">
          <div><dt>Teléfono</dt><dd>{reservation.phone}</dd></div><div><dt>Email</dt><dd>{reservation.email ?? 'No indicado'}</dd></div><div><dt>Código</dt><dd>{reservation.confirmationCode ?? '—'}</dd></div><div><dt>Historial</dt><dd>{reservation.visits > 1 ? `${reservation.visits - 1} visitas anteriores` : 'Primera visita'}</dd></div>
        </dl></section>

        <section className="drawer-section premium-drawer-section reservation-edit-section"><div className="drawer-section-head"><div><span className="admin-kicker">Contexto</span><h3>Notas de reserva</h3></div><span className="private-label">Equipo</span></div><div className="reservation-editor-grid">
          <label><span>Preferencias</span><textarea disabled={!canOperate} value={preferences} onChange={(event) => setPreferences(event.target.value)} placeholder="Terraza, trona, mesa tranquila…"/></label>
          <label><span>Alergias</span><textarea disabled={!canOperate} value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="Alergias o intolerancias"/></label>
          <label className="span-2"><span>Notas del cliente</span><textarea disabled={!canOperate} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ocasión, petición o contexto de la reserva"/></label>
          <label className="span-2"><span>Nota interna</span><textarea disabled={!canOperate} value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Información solo visible para el equipo"/></label>
        </div>{canOperate && <button className="text-action" disabled={loading} onClick={() => void onSaveNotes(reservation, { notes, preferences, allergies, internalNotes })}>Guardar información</button>}</section>

        <section className="drawer-section premium-drawer-section status-section"><div className="drawer-section-head"><div><span className="admin-kicker">Flujo</span><h3>Estado de la reserva</h3></div></div><div className="status-timeline">{(['confirmed','seated','completed'] as ReservationStatus[]).map((item, index) => { const order = ['pending','confirmed','seated','completed']; const active = order.indexOf(reservation.status) >= order.indexOf(item); return <div key={item} className={active ? 'done' : ''}><i>{active ? <CheckIcon/> : index + 1}</i><span>{item === 'confirmed' ? 'Confirmada' : item === 'seated' ? 'Sentada' : 'Completada'}</span></div>; })}</div></section>
      </div>

      <footer className="drawer-actions">
        {!cancelMode ? <>{primaryNext && <button className="admin-primary drawer-primary" disabled={!canOperate || loading} onClick={() => void onTransition(reservation.id, primaryNext)}>{nextPrimaryLabel(reservation.status)}</button>}{reservation.status === 'confirmed' && <button className="admin-secondary" disabled={!canOperate || loading} onClick={() => void onTransition(reservation.id, 'no_show')}>No-show</button>}{!['cancelled','completed','no_show'].includes(reservation.status) && <button className="danger-link" disabled={!canOperate || loading} onClick={() => setCancelMode(true)}>Cancelar</button>}</> : <div className="cancel-confirmation"><p><strong>¿Cancelar esta reserva?</strong><span>La mesa volverá a estar disponible y la reserva quedará en el historial.</span></p><div><button className="admin-secondary" onClick={() => setCancelMode(false)}>Volver</button><button className="danger-button" disabled={loading} onClick={() => { void onTransition(reservation.id, 'cancelled'); setCancelMode(false); }}>Confirmar</button></div></div>}
      </footer>
    </aside>
  </div>;
}

function CreateReservationModal({ date, loading, onClose, onCreated }: { date: string; loading: boolean; onClose: () => void; onCreated: (reservationId: string) => Promise<void> }) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useDialogFocus<HTMLElement>(onClose);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailabilityLoading(true); setAvailabilityError(null); setSelectedSlot(null);
      try {
        const response = await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}&adults=${adults}&children=${children}`, { cache: 'no-store', signal: controller.signal });
        const body = await parseResponse(response);
        setSlots(body.slots ?? []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setAvailabilityError((error as Error).message);
      } finally { if (!controller.signal.aborted) setAvailabilityLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [date, adults, children]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    for (const slot of slots) map.set(slot.serviceName, [...(map.get(slot.serviceName) ?? []), slot]);
    return [...map.entries()];
  }, [slots]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) return setAvailabilityError('Selecciona primero una hora disponible.');
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setAvailabilityError(null);
    try {
      const result = await parseResponse(await fetch('/api/admin/reservations/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        date, serviceId: selectedSlot.serviceId, startsAt: selectedSlot.startsAt, adults, children,
        firstName: form.get('firstName'), lastName: form.get('lastName'), phone: form.get('phone'), email: form.get('email'), source: form.get('source'),
        allergies: form.get('allergies'), preferences: form.get('preferences'), notes: form.get('notes'), internalNotes: form.get('internalNotes'),
      }) }));
      await onCreated(String(result.reservationId));
    } catch (error) { setAvailabilityError((error as Error).message); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-overlay modal-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section ref={dialogRef} className="create-reservation-modal premium-create-reservation" role="dialog" aria-modal="true" aria-labelledby="create-reservation-title" tabIndex={-1}><header className="drawer-topbar"><div><span className="admin-kicker">Nueva reserva</span><p>{dateLabel(date)} · disponibilidad real</p></div><button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon/></button></header><form onSubmit={submit}><div className="create-scroll">
    <div className="create-intro"><h2 id="create-reservation-title">Reserva manual, sin atajos.</h2><p>El horario se valida contra el mismo motor que utiliza la web y la mesa se bloquea atómicamente al confirmar.</p></div>
    <div className="create-form-section"><span className="admin-kicker">1 · Comensales y hora</span><div className="create-form-grid"><label><span>Adultos</span><input type="number" min="1" max="30" value={adults} onChange={(event) => setAdults(Math.max(1, Number(event.target.value) || 1))}/></label><label><span>Niños</span><input type="number" min="0" max="20" value={children} onChange={(event) => setChildren(Math.max(0, Number(event.target.value) || 0))}/></label></div>
      <div className="admin-slot-selector">{availabilityLoading ? <p className="slot-loading">Calculando disponibilidad real…</p> : grouped.length ? grouped.map(([serviceName, serviceSlots]) => <div key={serviceName}><div className="slot-service-head"><strong>{serviceName}</strong><span>{serviceSlots.length} horas</span></div><div className="admin-slots">{serviceSlots.map((slot) => <button type="button" key={`${slot.serviceId}:${slot.startsAt}`} className={selectedSlot?.startsAt === slot.startsAt && selectedSlot.serviceId === slot.serviceId ? 'active' : ''} onClick={() => setSelectedSlot(slot)}>{localTime(slot.startsAt)}</button>)}</div></div>) : <p className="slot-loading">No hay huecos disponibles para {adults + children} personas.</p>}</div>
    </div>
    <div className="create-form-section"><span className="admin-kicker">2 · Cliente</span><div className="create-form-grid"><label><span>Nombre</span><input name="firstName" required placeholder="Nombre"/></label><label><span>Apellidos</span><input name="lastName" required placeholder="Apellidos"/></label><label><span>Teléfono</span><input name="phone" type="tel" required placeholder="+34"/></label><label><span>Email</span><input name="email" type="email" placeholder="Opcional"/></label><label><span>Origen</span><select name="source" defaultValue="phone"><option value="phone">Teléfono</option><option value="admin">Recepción / Admin</option><option value="instagram">Instagram</option><option value="google">Google</option><option value="other">Otro</option></select></label><label><span>Preferencias</span><input name="preferences" placeholder="Terraza, trona…"/></label><label className="span-2"><span>Alergias</span><input name="allergies" placeholder="Alergias o intolerancias"/></label><label className="span-2"><span>Notas del cliente</span><textarea name="notes" placeholder="Ocasión o petición especial"/></label><label className="span-2"><span>Nota interna</span><textarea name="internalNotes" placeholder="Contexto solo para el equipo"/></label></div></div>
    {availabilityError && <div className="staff-login-error create-error" role="alert">{availabilityError}</div>}
    {selectedSlot && <div className="selected-admin-slot" role="status"><CheckIcon/><div><span>Hora seleccionada</span><strong>{selectedSlot.serviceName} · {localTime(selectedSlot.startsAt)} · {adults + children} pax</strong></div></div>}
  </div><footer className="create-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit" disabled={loading || submitting || !selectedSlot}>{submitting ? 'Reservando…' : 'Crear reserva'}</button></footer></form></section></div>;
}
