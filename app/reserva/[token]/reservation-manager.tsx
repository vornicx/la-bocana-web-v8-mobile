'use client';

import { useState } from 'react';
import { BocanaCalendar } from '@/components/bocana-calendar';
import { BrandMark } from '@/components/brand-mark';
import type { PublicLocale } from '@/lib/i18n';

type Initial = Record<string, unknown>;
type Slot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };

const copy = {
  es: { home: 'La Bocana, inicio', eyebrow: 'Gestionar reserva', operationError: 'No se pudo completar la operación.', cancelConfirm: '¿Quieres cancelar esta reserva?', cancelledMessage: 'Reserva cancelada correctamente.', modifiedMessage: 'Reserva modificada correctamente.', cancelledTitle: 'Reserva cancelada', title: 'Tu reserva', date: 'Fecha', time: 'Hora', guests: 'Personas', people: 'personas', service: 'Servicio', modify: 'Modificar', processing: 'Procesando…', cancel: 'Cancelar reserva', find: 'Buscar una nueva hora', reassurance: 'Tu reserva actual se mantiene hasta que el nuevo horario quede asegurado.', adults: 'Adultos', children: 'Niños', checking: 'Consultando…', availability: 'Ver disponibilidad', noSlots: 'No hay horarios disponibles con estos criterios. Prueba otra fecha o un número distinto de comensales.' },
  en: { home: 'La Bocana, home', eyebrow: 'Manage reservation', operationError: 'We could not complete the operation.', cancelConfirm: 'Would you like to cancel this reservation?', cancelledMessage: 'Your reservation has been cancelled.', modifiedMessage: 'Your reservation has been updated.', cancelledTitle: 'Reservation cancelled', title: 'Your reservation', date: 'Date', time: 'Time', guests: 'Guests', people: 'guests', service: 'Service', modify: 'Change', processing: 'Processing…', cancel: 'Cancel reservation', find: 'Find a new time', reassurance: 'Your current reservation remains unchanged until the new time is secured.', adults: 'Adults', children: 'Children', checking: 'Checking…', availability: 'Check availability', noSlots: 'There are no available times for these criteria. Try another date or party size.' },
} as const;

export default function ManageReservation({ token, initial, minDate, maxDate, locale = 'es' }: { token: string; initial: Initial; minDate: string; maxDate: string; locale?: PublicLocale }) {
  const t = copy[locale];
  const language = locale === 'es' ? 'es-ES' : 'en-GB';
  const time = (v: string) => new Intl.DateTimeFormat(language,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(v));
  const fullDate = (v: string) => new Intl.DateTimeFormat(language,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(v));
  const [reservation, setReservation] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [date, setDate] = useState(String(initial.reservation_date ?? '').slice(0,10));
  const [adults, setAdults] = useState(Number(initial.adults ?? 1));
  const [children, setChildren] = useState(Number(initial.children ?? 0));

  async function requestJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || t.operationError);
    return body;
  }

  async function reload() {
    const body = await requestJson(`/api/reservations/manage/${encodeURIComponent(token)}`, { cache:'no-store' });
    setReservation(body.reservation);
  }

  async function cancel() {
    if (!window.confirm(t.cancelConfirm)) return;
    setLoading(true); setError(''); setMessage('');
    try {
      await requestJson(`/api/reservations/manage/${encodeURIComponent(token)}`, { method:'DELETE', headers:{'content-type':'application/json'}, body:JSON.stringify({}) });
      await reload();
      setMessage(t.cancelledMessage);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  async function findSlots() {
    setLoading(true); setError(''); setMessage(''); setSlots([]); setSearched(false);
    try {
      const params = new URLSearchParams({ date, adults: String(adults), children: String(children) });
      const body = await requestJson(`/api/reservations/availability?${params}`, { cache:'no-store' });
      setSlots(body.slots ?? []);
      setSearched(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  async function modify(slot: Slot) {
    setLoading(true); setError(''); setMessage('');
    try {
      await requestJson(`/api/reservations/manage/${encodeURIComponent(token)}`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({date,adults,children,serviceId:slot.serviceId,startsAt:slot.startsAt}) });
      await reload();
      setMessage(t.modifiedMessage); setEditing(false); setSlots([]); setSearched(false);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  const status = String(reservation.status ?? '');
  const active = !['cancelled','completed','no_show'].includes(status);
  return <main className="manage-page" id="main-content"><div className="manage-shell">
    <header className="manage-header"><a href={locale === 'es' ? '/' : '/en'} aria-label={t.home}><BrandMark compact /></a><span className="eyebrow dark">{t.eyebrow}</span></header>
    <section className="manage-card"><span className="eyebrow dark">{String(reservation.confirmation_code ?? '')}</span><h1>{status === 'cancelled' ? t.cancelledTitle : t.title}</h1>
      <div className="manage-details"><div><span>{t.date}</span><strong>{fullDate(String(reservation.starts_at))}</strong></div><div><span>{t.time}</span><strong>{time(String(reservation.starts_at))}</strong></div><div><span>{t.guests}</span><strong>{String(reservation.party_size)} {t.people}</strong></div><div><span>{t.service}</span><strong>{String(reservation.service_name ?? '')}</strong></div></div>
      {message && <p className="waitlist-success" role="status">{message}</p>}{error && <div className="error-box" role="alert">{error}</div>}
      {active && <div className="manage-actions"><button className="secondary-button" type="button" disabled={loading} aria-expanded={editing} onClick={()=>{ setEditing(!editing); setError(''); setMessage(''); }}>{t.modify}</button><button className="danger-button" type="button" disabled={loading} onClick={cancel}>{loading ? t.processing : t.cancel}</button></div>}
      {editing && <div className="modify-box"><h3>{t.find}</h3><p className="muted">{t.reassurance}</p><div className="manage-calendar"><BocanaCalendar value={date} min={minDate} max={maxDate} locale={locale} onChange={(value)=>{ setDate(value); setSlots([]); setSearched(false); }} /></div><div className="mini-grid party"><label>{t.adults}<input type="number" min="1" max="30" value={adults} onChange={event=>{ setAdults(Math.min(30, Math.max(1, Number(event.target.value) || 1))); setSlots([]); setSearched(false); }}/></label><label>{t.children}<input type="number" min="0" max="20" value={children} onChange={event=>{ setChildren(Math.min(20, Math.max(0, Number(event.target.value) || 0))); setSlots([]); setSearched(false); }}/></label></div><button className="secondary-button" type="button" disabled={loading || !date} onClick={findSlots}>{loading ? t.checking : t.availability}</button>{searched && !slots.length && <p className="manage-empty" role="status">{t.noSlots}</p>}<div className="modify-slots">{slots.map(slot=><button type="button" disabled={loading} key={`${slot.serviceId}:${slot.startsAt}`} onClick={()=>modify(slot)}>{slot.serviceName} · {time(slot.startsAt)}</button>)}</div></div>}
    </section>
  </div></main>;
}
