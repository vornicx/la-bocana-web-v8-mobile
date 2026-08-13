'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckIcon, CloseIcon } from '@/components/admin/admin-icons';
import { useDialogFocus } from '@/components/admin/use-dialog-focus';
import type { AdminWaitlistItem, WaitlistStatus } from '@/lib/admin/types';

const statusLabels: Record<WaitlistStatus, string> = {
  waiting: 'En espera', offered: 'Hueco ofrecido', converted: 'Convertida', expired: 'Expirada', cancelled: 'Cancelada',
};

type AvailabilitySlot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}
function fullDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00Z`));
}
function cleanTime(value: string | null) { return value ? value.slice(0, 5) : null; }
function requestedTime(item: AdminWaitlistItem) {
  if (item.preferredTime) return cleanTime(item.preferredTime);
  if (item.flexibleFrom && item.flexibleTo) return `${cleanTime(item.flexibleFrom)}–${cleanTime(item.flexibleTo)}`;
  return 'Flexible';
}
function localTime(value: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
}
async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar la operación.');
  return payload;
}
function splitName(item: AdminWaitlistItem) {
  if (item.firstName || item.lastName) return { firstName: item.firstName ?? '', lastName: item.lastName ?? '' };
  const parts = item.customerName.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts.shift() ?? '', lastName: parts.join(' ') };
}

export function WaitlistPageClient({ initialItems, canOperate }: { initialItems: AdminWaitlistItem[]; canOperate: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [converting, setConverting] = useState<AdminWaitlistItem | null>(null);
  const activeStatuses = useMemo(() => new Set<WaitlistStatus>(['waiting', 'offered']), []);
  const visible = items.filter((item) => filter === 'active' ? activeStatuses.has(item.status) : !activeStatuses.has(item.status));
  const waiting = items.filter((item) => item.status === 'waiting').length;
  const offered = items.filter((item) => item.status === 'offered').length;

  async function transition(item: AdminWaitlistItem, status: WaitlistStatus) {
    setBusy(item.id); setMessage(null);
    try {
      const payload = await parseResponse(await fetch('/api/admin/waitlist/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ waitlistId: item.id, status }) }));
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status, offeredAt: status === 'offered' ? payload.offeredAt : null, offerExpiresAt: status === 'offered' ? payload.offerExpiresAt : null } : row));
      setMessage(status === 'offered' ? 'Hueco marcado como ofrecido. Si el cliente acepta, conviértelo aquí mismo en una reserva real.' : 'Estado actualizado.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(null); }
  }

  function converted(item: AdminWaitlistItem, reservationId: string, confirmationCode: string, warning?: string | null) {
    setItems((current) => current.map((row) => row.id === item.id ? { ...row, status: 'converted', convertedReservationId: reservationId } : row));
    setConverting(null);
    setMessage(`Reserva ${confirmationCode} creada y vinculada a la solicitud.${warning ? ` ${warning}` : ''}`);
  }

  return <div className="admin-page waitlist-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Demanda recuperable · flujo completo</span><h1>Lista de espera</h1><p>Ofrece huecos liberados y convierte la aceptación en una reserva real sin salir de Control.</p></div><Link className="admin-primary" href="/control/reservas">Ir a reservas</Link></div>
    <div className="waitlist-summary"><div><span>Esperando</span><strong>{waiting}</strong><small>Sin oferta activa</small></div><div><span>Ofertas abiertas</span><strong>{offered}</strong><small>Pendientes de aceptación</small></div><div><span>Personas recuperables</span><strong>{items.filter((item) => activeStatuses.has(item.status)).reduce((sum, item) => sum + item.partySize, 0)}</strong><small>Demanda activa total</small></div></div>
    <div className="waitlist-commandbar"><div className="segmented"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Activas <span>{waiting + offered}</span></button><button className={filter === 'history' ? 'active' : ''} onClick={() => setFilter('history')}>Historial <span>{items.length - waiting - offered}</span></button></div><p>Ordenadas por fecha solicitada y antigüedad.</p></div>
    {message && <div className="admin-feedback" role="status">{message}</div>}
    <div className="waitlist-cards">{visible.map((item) => <article className={`waitlist-card waitlist-${item.status}`} key={item.id}><div className="waitlist-date"><span>{dateLabel(item.desiredDate)}</span><strong>{requestedTime(item)}</strong><small>{item.serviceName ?? 'Cualquier servicio'}</small></div><div className="waitlist-person"><div className="waitlist-person-head"><div><h2>{item.customerName}</h2><p>{item.partySize} pax · {item.adults} adultos{item.children ? ` · ${item.children} niños` : ''}</p></div><span className={`waitlist-status status-${item.status}`}>{statusLabels[item.status]}</span></div><div className="waitlist-contact">{item.phone ? <><a href={`tel:${item.phone}`}>Llamar</a><a href={`https://wa.me/${item.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></> : <span>Sin teléfono</span>}{item.email && <a href={`mailto:${item.email}`}>Email</a>}</div>{item.status === 'offered' && item.offerExpiresAt && <small className="offer-expiry">Oferta registrada hasta las {new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(item.offerExpiresAt))}</small>}</div><div className="waitlist-actions">{item.status === 'waiting' && <button className="admin-primary" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'offered')}>Ofrecer hueco</button>}{item.status === 'offered' && <><button className="admin-primary" disabled={!canOperate || busy === item.id} onClick={() => setConverting(item)}>Convertir en reserva</button><button className="admin-secondary" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'waiting')}>Retirar oferta</button></>}{activeStatuses.has(item.status) && <button className="admin-quiet danger-text" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'cancelled')}>Cancelar solicitud</button>}{!activeStatuses.has(item.status) && <small>{item.convertedReservationId ? <Link href={`/control/reservas?reservation=${item.convertedReservationId}`}>Abrir reserva vinculada</Link> : 'Solicitud cerrada'}</small>}</div></article>)}</div>
    {!visible.length && <div className="admin-panel waitlist-empty"><span className="admin-kicker">Sin elementos</span><h2>{filter === 'active' ? 'No hay demanda en espera.' : 'Todavía no hay historial cerrado.'}</h2><p>{filter === 'active' ? 'Cuando una fecha se complete, las solicitudes aparecerán aquí automáticamente.' : 'Las solicitudes convertidas, expiradas o canceladas quedan conservadas aquí.'}</p></div>}
    <div className="reservation-footnote"><span><i/> Flujo conectado</span><p>“Ofrecer hueco” registra una ventana de 15 minutos. Cuando el cliente acepta, la conversión valida disponibilidad de nuevo, crea la reserva con el motor real y enlaza ambos registros.</p></div>
    {converting && <WaitlistConversionModal item={converting} onClose={() => setConverting(null)} onConverted={converted} />}
  </div>;
}

function WaitlistConversionModal({ item, onClose, onConverted }: { item: AdminWaitlistItem; onClose: () => void; onConverted: (item: AdminWaitlistItem, reservationId: string, confirmationCode: string, warning?: string | null) => void }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selected, setSelected] = useState<AvailabilitySlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useDialogFocus<HTMLElement>(onClose);
  const names = splitName(item);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(null);
      try {
        const payload = await parseResponse(await fetch(`/api/reservations/availability?date=${encodeURIComponent(item.desiredDate)}&adults=${item.adults}&children=${item.children}`, { cache: 'no-store', signal: controller.signal }));
        const received = (payload.slots ?? []) as AvailabilitySlot[];
        const preferredService = item.serviceName ? received.filter((slot) => slot.serviceName === item.serviceName) : [];
        setSlots(preferredService.length ? preferredService : received);
      } catch (reason) {
        if ((reason as Error).name !== 'AbortError') setError((reason as Error).message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [item]);

  const grouped = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>();
    slots.forEach((slot) => map.set(slot.serviceName, [...(map.get(slot.serviceName) ?? []), slot]));
    return [...map.entries()];
  }, [slots]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return setError('Selecciona una hora disponible.');
    const form = new FormData(event.currentTarget);
    setSubmitting(true); setError(null);
    try {
      const payload = await parseResponse(await fetch('/api/admin/reservations/create', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
          date: item.desiredDate,
          serviceId: selected.serviceId,
          startsAt: selected.startsAt,
          adults: item.adults,
          children: item.children,
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          phone: form.get('phone'),
          email: form.get('email'),
          source: 'admin',
          internalNotes: `Convertida desde lista de espera · ${item.id}`,
          waitlistId: item.id,
        }),
      }));
      onConverted(item, String(payload.reservationId), String(payload.confirmationCode), payload.warning ? String(payload.warning) : null);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSubmitting(false); }
  }

  return <div className="admin-overlay modal-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={dialogRef} className="waitlist-conversion-modal" role="dialog" aria-modal="true" aria-labelledby="waitlist-conversion-title" tabIndex={-1}>
      <header className="drawer-topbar"><div><span className="admin-kicker">Conversión protegida</span><p>{fullDateLabel(item.desiredDate)} · {item.partySize} pax</p></div><button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon /></button></header>
      <form onSubmit={submit}>
        <div className="waitlist-conversion-scroll">
          <div className="waitlist-conversion-intro"><span><CheckIcon /></span><div><h2 id="waitlist-conversion-title">Convertir en reserva</h2><p>La disponibilidad se comprueba otra vez antes de bloquear la mesa. La solicitud quedará vinculada a la reserva creada.</p></div></div>
          <section className="waitlist-conversion-section"><span className="admin-kicker">1 · Hora disponible</span><div className="waitlist-requested-time"><span>Solicitado</span><strong>{requestedTime(item)} · {item.serviceName ?? 'cualquier servicio'}</strong></div>{loading ? <p className="slot-loading">Recalculando disponibilidad…</p> : grouped.length ? grouped.map(([serviceName, serviceSlots]) => <div className="waitlist-slot-group" key={serviceName}><div><strong>{serviceName}</strong><small>{serviceSlots.length} huecos</small></div><div className="admin-slots">{serviceSlots.map((slot) => <button type="button" key={`${slot.serviceId}:${slot.startsAt}`} className={selected?.startsAt === slot.startsAt && selected.serviceId === slot.serviceId ? 'active' : ''} onClick={() => setSelected(slot)}>{localTime(slot.startsAt)}</button>)}</div></div>) : <p className="slot-loading">Ya no hay huecos disponibles para este grupo.</p>}</section>
          <section className="waitlist-conversion-section"><span className="admin-kicker">2 · Confirmar cliente</span><div className="create-form-grid"><label><span>Nombre</span><input name="firstName" defaultValue={names.firstName} required /></label><label><span>Apellidos</span><input name="lastName" defaultValue={names.lastName} required /></label><label><span>Teléfono</span><input name="phone" type="tel" defaultValue={item.phone ?? ''} required placeholder="+34" /></label><label><span>Email</span><input name="email" type="email" defaultValue={item.email ?? ''} /></label></div></section>
          {selected && <div className="selected-admin-slot"><CheckIcon /><div><span>Reserva a crear</span><strong>{selected.serviceName} · {localTime(selected.startsAt)} · {item.partySize} pax</strong></div></div>}
          {error && <div className="staff-login-error create-error" role="alert">{error}</div>}
        </div>
        <footer className="create-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="admin-primary" disabled={!selected || submitting}>{submitting ? 'Creando reserva…' : 'Confirmar conversión'}</button></footer>
      </form>
    </section>
  </div>;
}
