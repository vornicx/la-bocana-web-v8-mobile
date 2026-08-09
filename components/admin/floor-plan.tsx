'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import type { AdminReservation, DiningTable, FloorSnapshot, ReservationStatus } from '@/lib/admin/types';
import { CheckIcon, CloseIcon, PlusIcon, TableIcon, UserIcon } from './admin-icons';
import { StatusPill } from './status-pill';
import { useDialogFocus } from './use-dialog-focus';

type AssignmentMode = {
  reservationId: string;
  sourceTableIds: string[];
  targetTableIds: string[];
};

function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function initialService(snapshot: FloorSnapshot) {
  const madridHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }).format(new Date()));
  const preferred = madridHour >= 18 ? 'cena' : 'comida';
  return snapshot.services.find((item) => item.slug === preferred)?.id ?? snapshot.services[0]?.id ?? '';
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`));
}

function shortDateLabel(date: string) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00Z`)).replace('.', '');
}

function shiftDateValue(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function stateLabel(state: DiningTable['state']) {
  if (state === 'free') return 'Libre';
  if (state === 'reserved') return 'Reservada';
  if (state === 'seated') return 'Sentada';
  return 'Bloqueada';
}

function sourceLabel(source: AdminReservation['source']) {
  if (source === 'website') return 'Web';
  if (source === 'phone') return 'Teléfono';
  if (source === 'walk_in') return 'Walk-in';
  if (source === 'instagram') return 'Instagram';
  if (source === 'google') return 'Google';
  if (source === 'other') return 'Otro';
  return 'Admin';
}

function canCombine(targetIds: string[], snapshot: FloorSnapshot) {
  if (targetIds.length <= 1) return true;
  const sorted = [...targetIds].sort().join('|');
  return snapshot.combinations.some((combo) => [...combo.tableIds].sort().join('|') === sorted);
}

async function parseResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'No se pudo completar la operación.');
  return body;
}

export function FloorPlan({ initialSnapshot, canOperate }: { initialSnapshot: FloorSnapshot; canOperate: boolean }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [serviceId, setServiceId] = useState(() => initialService(initialSnapshot));
  const [selected, setSelected] = useState<string | null>(() => initialSnapshot.tables[0]?.id ?? null);
  const [assignment, setAssignment] = useState<AssignmentMode | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const service = snapshot.services.find((item) => item.id === serviceId) ?? snapshot.services[0] ?? null;
  const activeReservations = useMemo(() => snapshot.reservations.filter((item) =>
    item.serviceId === service?.id && !['completed', 'cancelled', 'no_show'].includes(item.status)
  ), [snapshot.reservations, service?.id]);

  const tableItems = useMemo(() => snapshot.tables.map((base) => {
    const reservation = activeReservations.find((item) => item.tableIds?.includes(base.id));
    const blocked = Boolean(service && base.blockedServiceIds?.includes(service.id));
    const state: DiningTable['state'] = blocked
      ? 'blocked'
      : reservation?.status === 'seated'
        ? 'seated'
        : reservation
          ? 'reserved'
          : 'free';
    return { ...base, state, reservationId: reservation?.id };
  }), [snapshot.tables, activeReservations, service]);

  const table = tableItems.find((item) => item.id === selected) ?? tableItems[0] ?? null;
  const reservation = table?.reservationId
    ? activeReservations.find((item) => item.id === table.reservationId) ?? null
    : null;
  const unassigned = activeReservations.filter((item) => !(item.tableIds?.length));
  const freeSeats = tableItems.filter((item) => item.state === 'free').reduce((sum, item) => sum + item.seats, 0);
  const seatedCovers = activeReservations.filter((item) => item.status === 'seated').reduce((sum, item) => sum + item.partySize, 0);
  const reservedCovers = activeReservations.filter((item) => ['pending', 'confirmed'].includes(item.status)).reduce((sum, item) => sum + item.partySize, 0);
  const nextArrival = activeReservations
    .filter((item) => ['pending', 'confirmed'].includes(item.status) && item.startsAt && new Date(item.startsAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.startsAt ?? 0).getTime() - new Date(b.startsAt ?? 0).getTime())[0] ?? null;

  const assignmentReservation = assignment
    ? activeReservations.find((item) => item.id === assignment.reservationId) ?? snapshot.reservations.find((item) => item.id === assignment.reservationId) ?? null
    : null;
  const targetCapacity = assignment
    ? assignment.targetTableIds.reduce((sum, id) => sum + (tableItems.find((item) => item.id === id)?.seats ?? 0), 0)
    : 0;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }

  async function refresh(date = snapshot.date, preserveServiceId = serviceId) {
    const response = await fetch(`/api/admin/floor?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
    const next = await parseResponse(response) as FloorSnapshot;
    setSnapshot(next);
    const nextService = next.services.some((item) => item.id === preserveServiceId) ? preserveServiceId : initialService(next);
    setServiceId(nextService);
    setSelected((current) => next.tables.some((item) => item.id === current) ? current : next.tables[0]?.id ?? null);
    return next;
  }

  async function changeDate(date: string) {
    if (loading) return;
    setLoading(true);
    setAssignment(null);
    try { await refresh(date, serviceId); }
    catch (error) { flash((error as Error).message); }
    finally { setLoading(false); }
  }

  function changeService(nextServiceId: string) {
    setServiceId(nextServiceId);
    setAssignment(null);
    setSelected(snapshot.tables[0]?.id ?? null);
  }

  function openAssignment(reservationId: string) {
    if (!canOperate) return flash('Tu perfil tiene acceso de consulta.');
    const sourceTableIds = snapshot.reservations.find((item) => item.id === reservationId)?.tableIds ?? [];
    setAssignment({ reservationId, sourceTableIds, targetTableIds: [] });
  }

  function selectTable(tableId: string) {
    const target = tableItems.find((item) => item.id === tableId);
    if (!target) return;
    if (!assignment) return setSelected(tableId);

    const source = assignment.sourceTableIds.includes(tableId);
    if (target.state !== 'free' && !source) return flash(`${target.label} no está libre en este servicio.`);
    const exists = assignment.targetTableIds.includes(tableId);
    const nextTargets = exists ? assignment.targetTableIds.filter((id) => id !== tableId) : [...assignment.targetTableIds, tableId];
    if (!canCombine(nextTargets, snapshot)) return flash('Estas mesas no forman una combinación configurada.');
    setAssignment({ ...assignment, targetTableIds: nextTargets });
  }

  async function perform(path: string, payload: Record<string, unknown>, success: string) {
    if (loading) return;
    setLoading(true);
    try {
      await parseResponse(await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      await refresh();
      flash(success);
    } catch (error) {
      flash((error as Error).message);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function confirmAssignment() {
    if (!assignment || !assignmentReservation || !assignment.targetTableIds.length) return;
    if (targetCapacity < assignmentReservation.partySize) return flash(`Faltan ${assignmentReservation.partySize - targetCapacity} plazas.`);
    const names = assignment.targetTableIds.map((id) => tableItems.find((item) => item.id === id)?.label).filter(Boolean).join(' + ');
    try {
      await perform('/api/admin/floor/assign', { reservationId: assignment.reservationId, tableIds: assignment.targetTableIds }, `Reserva asignada a ${names}.`);
      setSelected(assignment.targetTableIds[0] ?? selected);
      setAssignment(null);
    } catch { /* el toast ya contiene el error */ }
  }

  async function transition(reservationId: string, status: ReservationStatus, message: string) {
    try { await perform('/api/admin/floor/status', { reservationId, status }, message); }
    catch { /* toast */ }
  }

  async function toggleBlocked(target: DiningTable) {
    if (!service) return;
    try {
      await perform('/api/admin/floor/block', {
        tableId: target.id,
        serviceId: service.id,
        date: snapshot.date,
        blocked: target.state !== 'blocked',
        reason: `Bloqueo manual · ${service.name}`,
      }, target.state === 'blocked' ? `${target.label} reactivada.` : `${target.label} bloqueada para ${service.name.toLowerCase()}.`);
    } catch { /* toast */ }
  }

  async function createWalkIn(payload: { name: string; partySize: number; duration: number }) {
    if (!table || !service) return;
    try {
      await perform('/api/admin/floor/walk-in', {
        serviceId: service.id,
        tableIds: [table.id],
        name: payload.name,
        partySize: payload.partySize,
        duration: payload.duration,
      }, `${payload.name || 'Walk-in'} sentado en ${table.label}.`);
      setWalkInOpen(false);
    } catch { /* toast */ }
  }

  const isToday = snapshot.date === todayMadrid();
  const serviceOpen = Boolean(service?.openTime && service?.closeTime);

  return (
    <>
      <section className="floor-commandbar premium-commandbar">
        <div className="floor-date-control">
          <button aria-label="Día anterior" onClick={() => changeDate(shiftDateValue(snapshot.date, -1))}>‹</button>
          <div><span className="admin-kicker">Día de servicio</span><strong>{dateLabel(snapshot.date)}</strong></div>
          <button aria-label="Día siguiente" onClick={() => changeDate(shiftDateValue(snapshot.date, 1))}>›</button>
          {!isToday && <button className="floor-today" onClick={() => changeDate(todayMadrid())}>Hoy</button>}
        </div>

        <div className="floor-service-tabs" aria-label="Servicio">
          {snapshot.services.map((item) => <button key={item.id} className={service?.id === item.id ? 'active' : ''} onClick={() => changeService(item.id)}>
            {item.name}<span>{item.openTime && item.closeTime ? `${item.openTime}–${item.closeTime}` : 'Sin horario'}</span>
          </button>)}
        </div>
        <div className={`floor-live ${isToday ? '' : 'historical'}`}><i />{isToday ? 'Operación en vivo' : 'Vista de planificación'}<strong>{shortDateLabel(snapshot.date)}</strong></div>
      </section>

      <section className="floor-metrics premium-floor-metrics" aria-label="Estado de sala">
        <div><span>Sentados</span><strong>{seatedCovers}</strong><small>comensales ahora</small></div>
        <div><span>Por llegar</span><strong>{reservedCovers}</strong><small>cubiertos previstos</small></div>
        <div><span>Plazas libres</span><strong>{freeSeats}</strong><small>según plano</small></div>
        <div className={unassigned.length ? 'attention' : ''}><span>Sin mesa</span><strong>{unassigned.length}</strong><small>{unassigned.length ? 'requieren atención' : 'todo asignado'}</small></div>
        <div className="next-arrival"><span>Próxima llegada</span><strong>{nextArrival?.time ?? '—'}</strong><small>{nextArrival ? `${nextArrival.customer} · ${nextArrival.partySize} pax` : 'sin llegadas pendientes'}</small></div>
      </section>

      {!serviceOpen && <section className="floor-service-notice"><strong>{service?.name ?? 'Servicio'} no tiene horario configurado este día.</strong><span>Puedes consultar el plano, pero las acciones ligadas al servicio están desactivadas.</span></section>}

      {unassigned.length > 0 && (
        <section className="floor-unassigned premium-unassigned">
          <div><span className="admin-kicker">Requiere atención</span><strong>{unassigned.length === 1 ? '1 reserva espera mesa' : `${unassigned.length} reservas esperan mesa`}</strong><small>La reserva sigue protegida; asigna la mesa cuando la sala esté preparada.</small></div>
          <div className="floor-unassigned-list">
            {unassigned.map((item) => <button key={item.id} disabled={!canOperate} onClick={() => openAssignment(item.id)}>
              <span><strong>{item.time}</strong>{item.customer}</span><small>{item.partySize} pax · {item.confirmationCode}</small><TableIcon />
            </button>)}
          </div>
        </section>
      )}

      {assignment && assignmentReservation && (
        <section className="floor-assignment-bar" aria-live="polite">
          <div className="assignment-copy"><span className="admin-kicker">Asignación protegida</span><strong>{assignmentReservation.customer} · {assignmentReservation.partySize} pax</strong><small>Selecciona la mesa destino. La asignación anterior no cambia hasta confirmar.</small></div>
          <div className={`assignment-capacity ${targetCapacity >= assignmentReservation.partySize ? 'valid' : ''}`}><span>Capacidad</span><strong>{targetCapacity} / {assignmentReservation.partySize}</strong></div>
          <div className="assignment-actions"><button className="admin-secondary" onClick={() => setAssignment(null)}><CloseIcon />Cancelar</button><button className="admin-primary" disabled={loading || !assignment.targetTableIds.length || targetCapacity < assignmentReservation.partySize} onClick={confirmAssignment}><CheckIcon />Confirmar</button></div>
        </section>
      )}

      <div className={`floor-layout premium-floor-layout ${assignment ? 'assigning' : ''}`}>
        <section className="floor-canvas-shell">
          <header className="floor-canvas-toolbar">
            <div><span className="admin-kicker">Sala operativa</span><strong>{service?.name ?? 'Servicio'} · {tableItems.length} mesas</strong></div>
            <div className="floor-canvas-status"><span><i className="dot-seated" />{activeReservations.filter((item) => item.status === 'seated').length} sentadas</span><span><i className="dot-reserved" />{activeReservations.filter((item) => ['pending','confirmed'].includes(item.status)).length} por llegar</span><small>{loading ? 'Actualizando…' : 'Datos de Supabase'}</small></div>
          </header>
          <div className="floor-board premium-floor real-floor">
            <div className="floor-water"><span>Mediterráneo</span></div>
            <div className="floor-terrace-line" />
            <div className="floor-zone zone-terrace">Terraza · mar</div>
            <div className="floor-landmark floor-pass">Paso de servicio</div>
            <div className="floor-empty-axis"><span>Plano operativo</span></div>
            {tableItems.map((item) => {
              const itemReservation = item.reservationId ? activeReservations.find((res) => res.id === item.reservationId) : null;
              const source = assignment?.sourceTableIds.includes(item.id);
              const assignmentTarget = assignment?.targetTableIds.includes(item.id);
              const invalidTarget = Boolean(assignment && item.state !== 'free' && !source);
              return <button key={item.id} onClick={() => selectTable(item.id)} aria-label={`${item.label}, ${stateLabel(item.state)}, ${item.seats} plazas`} className={`floor-table premium-table ${item.shape} ${item.state} ${selected === item.id && !assignment ? 'selected' : ''} ${source ? 'assignment-source' : ''} ${assignmentTarget ? 'assignment-target' : ''} ${invalidTarget ? 'assignment-unavailable' : ''}`} style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}>
                <span className="table-label">{item.label}</span>
                {itemReservation ? <><strong>{itemReservation.time}</strong><small>{itemReservation.partySize} pax</small></> : item.state === 'blocked' ? <><strong>—</strong><small>bloqueada</small></> : <><strong>{item.seats}</strong><small>plazas</small></>}
                {assignmentTarget && <i className="assignment-check"><CheckIcon /></i>}
              </button>;
            })}
          </div>
        </section>

        <aside className="floor-inspector premium-inspector real-inspector">
          {table ? <>
            <div className="floor-inspector-head"><div><small>{table.area}</small><h3>{table.label}</h3><p>{table.minSeats ?? 1}–{table.seats} plazas · {table.shape === 'round' ? 'redonda' : 'rectangular'}</p></div><span className={`table-state state-${table.state}`}>{stateLabel(table.state)}</span></div>
            {reservation ? <div className="floor-guest-card"><div className="floor-guest-time"><strong>{reservation.time}</strong><small>{reservation.duration} min · {reservation.confirmationCode}</small></div><div><StatusPill status={reservation.status}/><h4>{reservation.customer}</h4><p>{reservation.partySize} pax{reservation.children ? ` · ${reservation.children} niños` : ''}</p></div></div> : <div className="floor-free-card"><i><TableIcon /></i><div><strong>{table.state === 'blocked' ? 'Fuera de servicio' : 'Mesa disponible'}</strong><p>{table.state === 'blocked' ? table.blockedReason ?? `Bloqueada para ${service?.name.toLowerCase()}.` : 'Lista para asignación o entrada directa.'}</p></div></div>}

            {reservation && <dl className="floor-detail-list">
              <div><dt>Origen</dt><dd>{sourceLabel(reservation.source)}</dd></div>
              <div><dt>Visitas</dt><dd>{reservation.visits || 'Primera'}</dd></div>
              <div><dt>Contacto</dt><dd>{reservation.phone}</dd></div>
              <div><dt>Preferencias</dt><dd>{reservation.preferences ?? reservation.notes ?? '—'}</dd></div>
              <div className={reservation.allergies ? 'alert-row' : ''}><dt>Alergias</dt><dd>{reservation.allergies ?? 'No registradas'}</dd></div>
            </dl>}

            {!assignment && reservation && <div className="floor-inspector-actions">
              {reservation.status === 'pending' && <button className="admin-primary" disabled={!canOperate || loading} onClick={() => transition(reservation.id, 'confirmed', 'Reserva confirmada.')}>Confirmar reserva</button>}
              {['pending','confirmed'].includes(reservation.status) && <button className="admin-primary" disabled={!canOperate || loading} onClick={() => transition(reservation.id, 'seated', 'Mesa marcada como sentada.')}>Sentar mesa</button>}
              {reservation.status === 'seated' && <button className="admin-primary" disabled={!canOperate || loading} onClick={() => transition(reservation.id, 'completed', 'Visita completada y mesa liberada.')}>Completar y liberar</button>}
              <button className="admin-secondary" disabled={!canOperate || loading} onClick={() => openAssignment(reservation.id)}><TableIcon />Mover / combinar</button>
              <Link className="admin-quiet floor-open-reservation" href={`/admin/reservas?reservation=${reservation.id}`}>Abrir reserva</Link>
            </div>}

            {!assignment && !reservation && table.state === 'free' && <div className="floor-inspector-actions">
              {isToday && <button className="admin-primary" disabled={!canOperate || loading || !serviceOpen} onClick={() => setWalkInOpen(true)}><PlusIcon />Sentar walk-in</button>}
              <button className="admin-secondary" disabled={!canOperate || loading || !serviceOpen} onClick={() => toggleBlocked(table)}>Bloquear en {service?.name ?? 'servicio'}</button>
            </div>}
            {!assignment && table.state === 'blocked' && <div className="floor-inspector-actions"><button className="admin-secondary" disabled={!canOperate || loading || !serviceOpen} onClick={() => toggleBlocked(table)}>Reactivar para {service?.name ?? 'servicio'}</button></div>}
          </> : <div className="floor-inspector-empty"><TableIcon/><strong>Selecciona una mesa</strong><p>Consulta su estado y actúa sin salir del plano.</p></div>}
        </aside>
      </div>

      <section className="floor-footnote connected-note"><span><i/>Supabase en vivo</span><p>Reservas, asignaciones y estados se leen de la base real. La distribución y capacidades de las mesas siguen siendo datos QA hasta validar el plano físico definitivo con La Bocana.</p></section>

      {walkInOpen && table && service && <WalkInModal table={table} serviceName={service.name} defaultDuration={service.defaultDuration} loading={loading} onClose={() => setWalkInOpen(false)} onCreate={createWalkIn}/>}
      {toast && <div className="admin-toast" role="status">{toast}</div>}
    </>
  );
}

function WalkInModal({ table, serviceName, defaultDuration, loading, onClose, onCreate }: { table: DiningTable; serviceName: string; defaultDuration: number; loading: boolean; onClose: () => void; onCreate: (payload: { name: string; partySize: number; duration: number }) => void }) {
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({ name: String(form.get('name') || 'Walk-in'), partySize: Number(form.get('partySize') || 2), duration: Number(form.get('duration') || defaultDuration) });
  }
  return <div className="admin-overlay modal-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <div ref={dialogRef} className="walkin-modal premium-walkin" role="dialog" aria-modal="true" aria-labelledby="walkin-title" tabIndex={-1}>
      <header className="drawer-topbar"><div><span className="admin-kicker">Entrada sin reserva</span><p>{table.label} · {table.area} · {serviceName}</p></div><button className="drawer-close" onClick={onClose} aria-label="Cerrar"><CloseIcon/></button></header>
      <form onSubmit={submit}><div className="walkin-hero"><i><UserIcon/></i><div><h2 id="walkin-title">Sentar walk-in</h2><p>Se crea una reserva real, queda sentada y ocupa la mesa inmediatamente.</p></div></div>
        <div className="create-form-grid walkin-fields"><label className="span-2"><span>Nombre / referencia</span><input name="name" defaultValue="Walk-in" required /></label><label><span>Personas</span><input name="partySize" type="number" min="1" max={table.seats} defaultValue={Math.min(2, table.seats)} required /></label><label><span>Duración estimada</span><select name="duration" defaultValue={String(defaultDuration)}><option value="75">75 min</option><option value="90">90 min</option><option value="105">105 min</option><option value="120">120 min</option><option value="135">135 min</option></select></label></div>
        <div className="walkin-table-summary"><TableIcon/><span><strong>{table.label}</strong>{table.seats} plazas · {table.area}</span></div>
        <footer className="create-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit" disabled={loading}>{loading ? 'Guardando…' : 'Sentar ahora'}</button></footer>
      </form>
    </div>
  </div>;
}
