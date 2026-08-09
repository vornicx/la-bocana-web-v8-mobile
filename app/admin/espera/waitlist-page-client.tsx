'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AdminWaitlistItem, WaitlistStatus } from '@/lib/admin/types';

const statusLabels: Record<WaitlistStatus, string> = {
  waiting: 'En espera', offered: 'Hueco ofrecido', converted: 'Convertida', expired: 'Expirada', cancelled: 'Cancelada',
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

function cleanTime(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

function requestedTime(item: AdminWaitlistItem) {
  if (item.preferredTime) return cleanTime(item.preferredTime);
  if (item.flexibleFrom && item.flexibleTo) return `${cleanTime(item.flexibleFrom)}–${cleanTime(item.flexibleTo)}`;
  return 'Flexible';
}

export function WaitlistPageClient({ initialItems, canOperate }: { initialItems: AdminWaitlistItem[]; canOperate: boolean }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<'active' | 'history'>('active');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const activeStatuses = useMemo(() => new Set<WaitlistStatus>(['waiting', 'offered']), []);
  const visible = items.filter((item) => filter === 'active' ? activeStatuses.has(item.status) : !activeStatuses.has(item.status));
  const waiting = items.filter((item) => item.status === 'waiting').length;
  const offered = items.filter((item) => item.status === 'offered').length;

  async function transition(item: AdminWaitlistItem, status: WaitlistStatus) {
    setBusy(item.id);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/waitlist/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ waitlistId: item.id, status }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo actualizar la solicitud.');
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, status, offeredAt: status === 'offered' ? payload.offeredAt : null, offerExpiresAt: status === 'offered' ? payload.offerExpiresAt : null } : row));
      setMessage(status === 'offered' ? 'Hueco marcado como ofrecido. Contacta al cliente y confirma su reserva cuando acepte.' : 'Estado actualizado.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return <div className="admin-page waitlist-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Demanda recuperable · datos reales</span><h1>Ningún “no hay mesa” termina ahí.</h1><p>Prioriza solicitudes, ofrece huecos liberados y conserva el rastro de cada oportunidad.</p></div><Link className="admin-primary" href="/admin/reservas">Ir a reservas</Link></div>
    <div className="waitlist-summary"><div><span>Esperando</span><strong>{waiting}</strong><small>Sin oferta activa</small></div><div><span>Ofertas abiertas</span><strong>{offered}</strong><small>Pendientes de aceptación</small></div><div><span>Personas recuperables</span><strong>{items.filter((item) => activeStatuses.has(item.status)).reduce((sum, item) => sum + item.partySize, 0)}</strong><small>Demanda activa total</small></div></div>
    <div className="waitlist-commandbar"><div className="segmented"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>Activas <span>{waiting + offered}</span></button><button className={filter === 'history' ? 'active' : ''} onClick={() => setFilter('history')}>Historial <span>{items.length - waiting - offered}</span></button></div><p>Ordenadas por fecha solicitada y antigüedad.</p></div>
    {message && <div className="admin-feedback" role="status">{message}</div>}
    <div className="waitlist-cards">{visible.map((item) => <article className={`waitlist-card waitlist-${item.status}`} key={item.id}><div className="waitlist-date"><span>{dateLabel(item.desiredDate)}</span><strong>{requestedTime(item)}</strong><small>{item.serviceName ?? 'Cualquier servicio'}</small></div><div className="waitlist-person"><div className="waitlist-person-head"><div><h2>{item.customerName}</h2><p>{item.partySize} pax · {item.adults} adultos{item.children ? ` · ${item.children} niños` : ''}</p></div><span className={`waitlist-status status-${item.status}`}>{statusLabels[item.status]}</span></div><div className="waitlist-contact">{item.phone ? <><a href={`tel:${item.phone}`}>Llamar</a><a href={`https://wa.me/${item.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a></> : <span>Sin teléfono</span>}{item.email && <a href={`mailto:${item.email}`}>Email</a>}</div>{item.status === 'offered' && item.offerExpiresAt && <small className="offer-expiry">Oferta registrada hasta las {new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(item.offerExpiresAt))}</small>}</div><div className="waitlist-actions">{item.status === 'waiting' && <button className="admin-primary" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'offered')}>Ofrecer hueco</button>}{item.status === 'offered' && <button className="admin-secondary" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'waiting')}>Retirar oferta</button>}{activeStatuses.has(item.status) && <button className="admin-quiet danger-text" disabled={!canOperate || busy === item.id} onClick={() => transition(item, 'cancelled')}>Cancelar solicitud</button>}{!activeStatuses.has(item.status) && <small>{item.convertedReservationId ? 'Vinculada a una reserva' : 'Solicitud cerrada'}</small>}</div></article>)}</div>
    {!visible.length && <div className="admin-panel waitlist-empty"><span className="admin-kicker">Sin elementos</span><h2>{filter === 'active' ? 'No hay demanda en espera.' : 'Todavía no hay historial cerrado.'}</h2><p>{filter === 'active' ? 'Cuando una fecha se complete, las solicitudes aparecerán aquí automáticamente.' : 'Las solicitudes convertidas, expiradas o canceladas quedarán conservadas aquí.'}</p></div>}
    <div className="reservation-footnote"><span><i/> Flujo controlado</span><p>“Ofrecer hueco” registra la oportunidad y una ventana de 15 minutos. Hasta conectar el proveedor de comunicaciones, el contacto se realiza desde los accesos de teléfono, WhatsApp o email.</p></div>
  </div>;
}
