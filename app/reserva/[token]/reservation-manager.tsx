'use client';

import { useState } from 'react';

type Initial = Record<string, unknown>;
type Slot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };

const time = (v: string) => new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(v));
const fullDate = (v: string) => new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(v));

export default function ManageReservation({ token, initial, minDate, maxDate }: { token: string; initial: Initial; minDate: string; maxDate: string }) {
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
    if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
    return body;
  }

  async function reload() {
    const body = await requestJson(`/api/reservations/manage/${encodeURIComponent(token)}`, { cache:'no-store' });
    setReservation(body.reservation);
  }

  async function cancel() {
    if (!window.confirm('¿Quieres cancelar esta reserva?')) return;
    setLoading(true); setError(''); setMessage('');
    try {
      await requestJson(`/api/reservations/manage/${encodeURIComponent(token)}`, { method:'DELETE', headers:{'content-type':'application/json'}, body:JSON.stringify({}) });
      await reload();
      setMessage('Reserva cancelada correctamente.');
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
      setMessage('Reserva modificada correctamente.'); setEditing(false); setSlots([]); setSearched(false);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  const status = String(reservation.status ?? '');
  const active = !['cancelled','completed','no_show'].includes(status);
  return <main className="manage-page" id="main-content"><div className="manage-shell">
    <header className="manage-header"><div className="wordmark">LA BOCANA</div><span className="eyebrow dark">Gestionar reserva</span></header>
    <section className="manage-card"><span className="eyebrow dark">{String(reservation.confirmation_code ?? '')}</span><h1>{status === 'cancelled' ? 'Reserva cancelada' : 'Tu reserva'}</h1>
      <div className="manage-details"><div><span>Fecha</span><strong>{fullDate(String(reservation.starts_at))}</strong></div><div><span>Hora</span><strong>{time(String(reservation.starts_at))}</strong></div><div><span>Personas</span><strong>{String(reservation.party_size)} personas</strong></div><div><span>Servicio</span><strong>{String(reservation.service_name ?? '')}</strong></div></div>
      {message && <p className="waitlist-success" role="status">{message}</p>}{error && <div className="error-box" role="alert">{error}</div>}
      {active && <div className="manage-actions"><button className="secondary-button" type="button" disabled={loading} aria-expanded={editing} onClick={()=>{ setEditing(!editing); setError(''); setMessage(''); }}>Modificar</button><button className="danger-button" type="button" disabled={loading} onClick={cancel}>{loading ? 'Procesando…' : 'Cancelar reserva'}</button></div>}
      {editing && <div className="modify-box"><h3>Buscar una nueva hora</h3><p className="muted">Tu reserva actual se mantiene hasta que el nuevo horario quede asegurado.</p><div className="mini-grid"><label>Fecha<input type="date" min={minDate} max={maxDate} value={date} onChange={event=>{ setDate(event.target.value); setSlots([]); setSearched(false); }}/></label><label>Adultos<input type="number" min="1" max="30" value={adults} onChange={event=>{ setAdults(Math.min(30, Math.max(1, Number(event.target.value) || 1))); setSlots([]); setSearched(false); }}/></label><label>Niños<input type="number" min="0" max="20" value={children} onChange={event=>{ setChildren(Math.min(20, Math.max(0, Number(event.target.value) || 0))); setSlots([]); setSearched(false); }}/></label></div><button className="secondary-button" type="button" disabled={loading || !date} onClick={findSlots}>{loading ? 'Consultando…' : 'Ver disponibilidad'}</button>{searched && !slots.length && <p className="manage-empty" role="status">No hay horarios disponibles con estos criterios. Prueba otra fecha o un número distinto de comensales.</p>}<div className="modify-slots">{slots.map(slot=><button type="button" disabled={loading} key={`${slot.serviceId}:${slot.startsAt}`} onClick={()=>modify(slot)}>{slot.serviceName} · {time(slot.startsAt)}</button>)}</div></div>}
    </section>
  </div></main>;
}
