'use client';

import { useState } from 'react';

type Initial = Record<string, unknown>;
type Slot = { serviceId: string; serviceName: string; startsAt: string; endsAt: string; durationMinutes: number };

const time = (v: string) => new Intl.DateTimeFormat('es-ES',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(v));
const fullDate = (v: string) => new Intl.DateTimeFormat('es-ES',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(v));

export default function ManageReservation({ token, initial }: { token: string; initial: Initial }) {
  const [reservation, setReservation] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(String(initial.reservation_date ?? '').slice(0,10));
  const [adults, setAdults] = useState(Number(initial.adults ?? 1));
  const [children, setChildren] = useState(Number(initial.children ?? 0));

  async function reload() {
    const r = await fetch(`/api/reservations/manage/${token}`, { cache:'no-store' });
    const j = await r.json(); if (r.ok) setReservation(j.reservation);
  }
  async function cancel() {
    if (!window.confirm('¿Quieres cancelar esta reserva?')) return;
    setError('');
    const r = await fetch(`/api/reservations/manage/${token}`, { method:'DELETE', headers:{'content-type':'application/json'}, body:JSON.stringify({}) });
    const j = await r.json();
    if (!r.ok) return setError(j.error || 'No se pudo cancelar.');
    setMessage('Reserva cancelada correctamente.'); await reload();
  }
  async function findSlots() {
    setError(''); setSlots([]);
    const r = await fetch(`/api/reservations/availability?date=${date}&adults=${adults}&children=${children}`,{cache:'no-store'});
    const j = await r.json(); if (!r.ok) return setError(j.error || 'No se pudo consultar.'); setSlots(j.slots ?? []);
  }
  async function modify(slot: Slot) {
    setError('');
    const r = await fetch(`/api/reservations/manage/${token}`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify({date,adults,children,serviceId:slot.serviceId,startsAt:slot.startsAt}) });
    const j = await r.json(); if (!r.ok) return setError(j.error || 'No se pudo modificar.');
    setMessage('Reserva modificada.'); setEditing(false); setSlots([]); await reload();
  }
  const status = String(reservation.status ?? '');
  const active = !['cancelled','completed','no_show'].includes(status);
  return <main className="manage-page"><div className="manage-shell">
    <header className="manage-header"><div className="wordmark">LA BOCANA</div><span className="eyebrow dark">Gestionar reserva</span></header>
    <section className="manage-card"><span className="eyebrow dark">{String(reservation.confirmation_code ?? '')}</span><h1>{status === 'cancelled' ? 'Reserva cancelada' : 'Tu reserva'}</h1>
      <div className="manage-details"><div><span>Fecha</span><strong>{fullDate(String(reservation.starts_at))}</strong></div><div><span>Hora</span><strong>{time(String(reservation.starts_at))}</strong></div><div><span>Personas</span><strong>{String(reservation.party_size)} personas</strong></div><div><span>Servicio</span><strong>{String(reservation.service_name ?? '')}</strong></div></div>
      {message && <p className="waitlist-success">✓ {message}</p>}{error && <div className="error-box">{error}</div>}
      {active && <div className="manage-actions"><button className="secondary-button" onClick={()=>setEditing(!editing)}>Modificar</button><button className="danger-button" onClick={cancel}>Cancelar reserva</button></div>}
      {editing && <div className="modify-box"><h3>Buscar una nueva hora</h3><p className="muted">Tu reserva actual se mantiene hasta que el nuevo horario quede asegurado.</p><div className="mini-grid"><label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Adultos<input type="number" min="1" max="30" value={adults} onChange={e=>setAdults(Number(e.target.value))}/></label><label>Niños<input type="number" min="0" max="20" value={children} onChange={e=>setChildren(Number(e.target.value))}/></label></div><button className="secondary-button" onClick={findSlots}>Ver disponibilidad</button><div className="modify-slots">{slots.map(s=><button key={s.startsAt} onClick={()=>modify(s)}>{s.serviceName} · {time(s.startsAt)}</button>)}</div></div>}
    </section>
  </div></main>;
}
