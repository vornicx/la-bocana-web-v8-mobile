'use client';

import { FormEvent, useMemo, useState } from 'react';
import { reservations as seedReservations, tables as seedTables } from '@/lib/admin/mock-data';
import type { AdminReservation, DiningTable } from '@/lib/admin/types';
import { CheckIcon, CloseIcon, PlusIcon, TableIcon, UserIcon } from './admin-icons';
import { StatusPill } from './status-pill';

type AssignmentMode = {
  reservationId: string;
  sourceTableIds: string[];
  targetTableIds: string[];
};

const allowedCombinations = [
  ['T01', 'T02'],
  ['T03', 'T04'],
  ['T06', 'T07'],
  ['T07', 'T08'],
  ['T09', 'T10'],
  ['T11', 'T12'],
  ['T13', 'T14'],
];

function canCombine(tableIds: string[]) {
  if (tableIds.length <= 1) return true;
  return allowedCombinations.some((combination) => tableIds.every((id) => combination.includes(id)));
}

function stateLabel(state: DiningTable['state']) {
  if (state === 'free') return 'Libre';
  if (state === 'reserved') return 'Reservada';
  if (state === 'seated') return 'Sentada';
  return 'Bloqueada';
}

function nextId(items: AdminReservation[]) {
  return `R-${String(Math.max(...items.map((item) => Number(item.id.replace(/\D/g, '')) || 0)) + 1).padStart(4, '0')}`;
}

export function FloorPlan() {
  const [tableItems, setTableItems] = useState<DiningTable[]>(seedTables);
  const [reservationItems, setReservationItems] = useState<AdminReservation[]>(seedReservations);
  const [selected, setSelected] = useState<string | null>('T05');
  const [service, setService] = useState<'lunch' | 'dinner'>('lunch');
  const [assignment, setAssignment] = useState<AssignmentMode | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const table = tableItems.find((item) => item.id === selected) ?? null;
  const reservation = table?.reservationId
    ? reservationItems.find((item) => item.id === table.reservationId) ?? null
    : null;

  const activeReservations = useMemo(() => reservationItems.filter((item) => {
    const hour = Number(item.time.slice(0, 2));
    const inService = service === 'lunch' ? hour < 18 : hour >= 18;
    return inService && !['completed', 'cancelled', 'no_show'].includes(item.status);
  }), [reservationItems, service]);

  const unassigned = activeReservations.filter((item) => !item.table);
  const freeSeats = tableItems.filter((item) => item.state === 'free').reduce((sum, item) => sum + item.seats, 0);
  const seatedCovers = activeReservations.filter((item) => item.status === 'seated').reduce((sum, item) => sum + item.partySize, 0);
  const targetCapacity = assignment
    ? assignment.targetTableIds.reduce((sum, id) => sum + (tableItems.find((item) => item.id === id)?.seats ?? 0), 0)
    : 0;
  const assignmentReservation = assignment
    ? reservationItems.find((item) => item.id === assignment.reservationId) ?? null
    : null;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }

  function openAssignment(reservationId: string) {
    const sourceTableIds = tableItems.filter((item) => item.reservationId === reservationId).map((item) => item.id);
    setAssignment({ reservationId, sourceTableIds, targetTableIds: [] });
  }

  function selectTable(tableId: string) {
    const target = tableItems.find((item) => item.id === tableId);
    if (!target) return;

    if (assignment) {
      const source = assignment.sourceTableIds.includes(tableId);
      const available = target.state === 'free' || source;
      if (!available) {
        flash(`${target.label} está ocupada. Elige una mesa libre.`);
        return;
      }
      const exists = assignment.targetTableIds.includes(tableId);
      const nextTargets = exists
        ? assignment.targetTableIds.filter((id) => id !== tableId)
        : [...assignment.targetTableIds, tableId];
      if (!canCombine(nextTargets)) {
        flash('Estas mesas no forman una combinación física permitida.');
        return;
      }
      setAssignment({ ...assignment, targetTableIds: nextTargets });
      return;
    }

    setSelected(tableId);
  }

  function confirmAssignment() {
    if (!assignment || !assignmentReservation || !assignment.targetTableIds.length) return;
    if (targetCapacity < assignmentReservation.partySize) {
      flash(`Faltan ${assignmentReservation.partySize - targetCapacity} plazas para esta reserva.`);
      return;
    }

    const targetTables = assignment.targetTableIds
      .map((id) => tableItems.find((item) => item.id === id))
      .filter(Boolean) as DiningTable[];
    const nextState: DiningTable['state'] = assignmentReservation.status === 'seated' ? 'seated' : 'reserved';

    setTableItems((current) => current.map((item) => {
      if (item.reservationId === assignment.reservationId) {
        return { ...item, state: 'free', reservationId: undefined };
      }
      if (assignment.targetTableIds.includes(item.id)) {
        return { ...item, state: nextState, reservationId: assignment.reservationId };
      }
      return item;
    }));

    setReservationItems((current) => current.map((item) => item.id === assignment.reservationId
      ? {
          ...item,
          table: targetTables.map((target) => target.label).join(' + '),
          area: targetTables[0]?.area ?? item.area,
        }
      : item));

    setSelected(assignment.targetTableIds[0]);
    flash(`${assignmentReservation.customer} asignado a ${targetTables.map((target) => target.label).join(' + ')}.`);
    setAssignment(null);
  }

  function seatReservation(reservationId: string) {
    setReservationItems((current) => current.map((item) => item.id === reservationId ? { ...item, status: 'seated' } : item));
    setTableItems((current) => current.map((item) => item.reservationId === reservationId ? { ...item, state: 'seated' } : item));
    flash('Mesa marcada como sentada.');
  }

  function completeReservation(reservationId: string) {
    setReservationItems((current) => current.map((item) => item.id === reservationId ? { ...item, status: 'completed' } : item));
    setTableItems((current) => current.map((item) => item.reservationId === reservationId ? { ...item, state: 'free', reservationId: undefined } : item));
    flash('Visita completada y mesa liberada.');
  }

  function toggleBlocked(tableId: string) {
    setTableItems((current) => current.map((item) => item.id === tableId
      ? { ...item, state: item.state === 'blocked' ? 'free' : 'blocked' }
      : item));
    flash(table?.state === 'blocked' ? 'Mesa reactivada.' : 'Mesa bloqueada temporalmente.');
  }

  function createWalkIn(payload: { name: string; partySize: number; duration: number }) {
    if (!table || table.state !== 'free') return;
    if (payload.partySize > table.seats) {
      flash(`Esta mesa admite ${table.seats} personas. Usa una combinación para grupos mayores.`);
      return;
    }
    const id = nextId(reservationItems);
    const created: AdminReservation = {
      id,
      time: service === 'lunch' ? '14:35' : '21:35',
      duration: payload.duration,
      customer: payload.name || 'Walk-in',
      phone: 'Sin teléfono',
      partySize: payload.partySize,
      adults: payload.partySize,
      children: 0,
      table: table.label,
      area: table.area,
      status: 'seated',
      source: 'walk_in',
      visits: 0,
    };
    setReservationItems((current) => [...current, created]);
    setTableItems((current) => current.map((item) => item.id === table.id ? { ...item, state: 'seated', reservationId: id } : item));
    setWalkInOpen(false);
    flash(`${created.customer} sentado en ${table.label}.`);
  }

  return (
    <>
      <section className="floor-commandbar">
        <div className="floor-service-tabs" aria-label="Servicio">
          <button className={service === 'lunch' ? 'active' : ''} onClick={() => setService('lunch')}>Comida <span>13:00–16:30</span></button>
          <button className={service === 'dinner' ? 'active' : ''} onClick={() => setService('dinner')}>Cena <span>20:00–23:30</span></button>
        </div>
        <div className="floor-live"><i /> Servicio en curso <strong>{service === 'lunch' ? '14:35' : '21:35'}</strong></div>
      </section>

      <section className="floor-metrics" aria-label="Estado de sala">
        <div><span>Sentados ahora</span><strong>{seatedCovers}</strong><small>comensales</small></div>
        <div><span>Plazas libres</span><strong>{freeSeats}</strong><small>según plano</small></div>
        <div className={unassigned.length ? 'attention' : ''}><span>Sin mesa</span><strong>{unassigned.length}</strong><small>por asignar</small></div>
        <div><span>Próxima llegada</span><strong>{service === 'lunch' ? '15:00' : '22:00'}</strong><small>{service === 'lunch' ? 'Lucía · 6 pax' : 'Carmen · 2 pax'}</small></div>
      </section>

      {unassigned.length > 0 && (
        <section className="floor-unassigned">
          <div><span className="admin-kicker">Requiere atención</span><strong>{unassigned.length === 1 ? '1 reserva sin mesa asignada' : `${unassigned.length} reservas sin mesa asignada`}</strong></div>
          <div className="floor-unassigned-list">
            {unassigned.map((item) => (
              <button key={item.id} onClick={() => openAssignment(item.id)}>
                <span><strong>{item.time}</strong>{item.customer}</span><small>{item.partySize} pax · {item.area}</small><TableIcon />
              </button>
            ))}
          </div>
        </section>
      )}

      {assignment && assignmentReservation && (
        <section className="floor-assignment-bar" aria-live="polite">
          <div className="assignment-copy">
            <span className="admin-kicker">Modo asignación</span>
            <strong>{assignmentReservation.customer} · {assignmentReservation.partySize} pax</strong>
            <small>Selecciona una o varias mesas libres. Las mesas originales siguen protegidas hasta confirmar.</small>
          </div>
          <div className={`assignment-capacity ${targetCapacity >= assignmentReservation.partySize ? 'valid' : ''}`}>
            <span>Capacidad seleccionada</span><strong>{targetCapacity} / {assignmentReservation.partySize}</strong>
          </div>
          <div className="assignment-actions">
            <button className="admin-secondary" onClick={() => setAssignment(null)}><CloseIcon />Cancelar</button>
            <button className="admin-primary" disabled={!assignment.targetTableIds.length || targetCapacity < assignmentReservation.partySize} onClick={confirmAssignment}><CheckIcon />Confirmar</button>
          </div>
        </section>
      )}

      <div className={`floor-layout ${assignment ? 'assigning' : ''}`}>
        <section className="floor-canvas-shell">
          <header className="floor-canvas-toolbar">
            <div>
              <span className="admin-kicker">Vista de sala</span>
              <strong>{service === 'lunch' ? 'Comida' : 'Cena'} · {tableItems.length} mesas</strong>
            </div>
            <div className="floor-canvas-status">
              <span><i className="dot-seated" />{activeReservations.filter((item) => item.status === 'seated').length} sentadas</span>
              <span><i className="dot-reserved" />{activeReservations.filter((item) => item.status === 'confirmed').length} por llegar</span>
              <small>Toca una mesa para operar</small>
            </div>
          </header>
          <div className="floor-board premium-floor">
          <div className="floor-water"><span>Mediterráneo</span></div>
          <div className="floor-terrace-line" />
          <div className="floor-zone zone-terrace">Terraza · mar</div>
          <div className="floor-zone zone-inside">Interior</div>
          <div className="floor-landmark floor-pass">Paso de servicio</div>
          {tableItems.map((item) => {
            const itemReservation = item.reservationId ? reservationItems.find((res) => res.id === item.reservationId) : null;
            const source = assignment?.sourceTableIds.includes(item.id);
            const assignmentTarget = assignment?.targetTableIds.includes(item.id);
            const invalidTarget = Boolean(assignment && item.state !== 'free' && !source);
            return (
              <button
                key={item.id}
                onClick={() => selectTable(item.id)}
                aria-label={`${item.label}, ${stateLabel(item.state)}, ${item.seats} plazas`}
                className={`floor-table premium-table ${item.shape} ${item.state} ${selected === item.id && !assignment ? 'selected' : ''} ${source ? 'assignment-source' : ''} ${assignmentTarget ? 'assignment-target' : ''} ${invalidTarget ? 'assignment-unavailable' : ''}`}
                style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
              >
                <span className="table-label">{item.label}</span>
                {itemReservation ? <><strong>{itemReservation.time}</strong><small>{itemReservation.partySize} pax</small></> : <><strong>{item.seats}</strong><small>plazas</small></>}
                {assignmentTarget && <i className="assignment-check"><CheckIcon /></i>}
              </button>
            );
          })}
          </div>
        </section>

        <aside className="floor-inspector premium-inspector">
          {table ? (
            <>
              <div className="floor-inspector-head">
                <div><small>{table.area}</small><h3>{table.label}</h3><p>{table.seats} plazas · {table.shape === 'round' ? 'redonda' : 'rectangular'}</p></div>
                <span className={`table-state state-${table.state}`}>{stateLabel(table.state)}</span>
              </div>

              {reservation ? (
                <div className="floor-guest-card">
                  <div className="floor-guest-time"><strong>{reservation.time}</strong><small>hasta aprox. {reservation.duration} min</small></div>
                  <div><StatusPill status={reservation.status} /><h4>{reservation.customer}</h4><p>{reservation.partySize} pax{reservation.children ? ` · ${reservation.children} niños` : ''}</p></div>
                </div>
              ) : (
                <div className="floor-free-card">
                  <i><TableIcon /></i><div><strong>{table.state === 'blocked' ? 'Fuera de servicio' : 'Mesa disponible'}</strong><p>{table.state === 'blocked' ? 'No se ofrece en disponibilidad.' : 'Lista para nueva ocupación o asignación.'}</p></div>
                </div>
              )}

              {reservation && (
                <dl className="floor-detail-list">
                  <div><dt>Origen</dt><dd>{reservation.source === 'website' ? 'Web' : reservation.source === 'phone' ? 'Teléfono' : reservation.source === 'walk_in' ? 'Walk-in' : 'Admin'}</dd></div>
                  <div><dt>Visitas</dt><dd>{reservation.visits}</dd></div>
                  <div><dt>Preferencias</dt><dd>{reservation.preferences ?? reservation.notes ?? '—'}</dd></div>
                  <div className={reservation.allergies ? 'alert-row' : ''}><dt>Alergias</dt><dd>{reservation.allergies ?? 'No registradas'}</dd></div>
                </dl>
              )}

              {!assignment && reservation && (
                <div className="floor-inspector-actions">
                  {reservation.status === 'confirmed' && <button className="admin-primary" onClick={() => seatReservation(reservation.id)}>Sentar mesa</button>}
                  {reservation.status === 'seated' && <button className="admin-primary" onClick={() => completeReservation(reservation.id)}>Completar y liberar</button>}
                  <button className="admin-secondary" onClick={() => openAssignment(reservation.id)}><TableIcon />Mover / combinar</button>
                  <button className="admin-quiet">Abrir reserva completa</button>
                </div>
              )}

              {!assignment && !reservation && table.state === 'free' && (
                <div className="floor-inspector-actions">
                  <button className="admin-primary" onClick={() => setWalkInOpen(true)}><PlusIcon />Sentar walk-in</button>
                  <button className="admin-secondary" onClick={() => toggleBlocked(table.id)}>Bloquear mesa</button>
                </div>
              )}

              {!assignment && table.state === 'blocked' && (
                <div className="floor-inspector-actions"><button className="admin-secondary" onClick={() => toggleBlocked(table.id)}>Reactivar mesa</button></div>
              )}
            </>
          ) : <p>Selecciona una mesa para ver su estado.</p>}
        </aside>
      </div>

      <section className="floor-footnote">
        <span>Plano de desarrollo</span>
        <p>La distribución, capacidades y combinaciones son datos de QA. Antes de producción se sustituirán por el plano y las reglas validadas con La Bocana.</p>
      </section>

      {walkInOpen && table && (
        <WalkInModal table={table} onClose={() => setWalkInOpen(false)} onCreate={createWalkIn} />
      )}

      {toast && <div className="admin-toast" role="status">{toast}</div>}
    </>
  );
}

function WalkInModal({ table, onClose, onCreate }: { table: DiningTable; onClose: () => void; onCreate: (payload: { name: string; partySize: number; duration: number }) => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onCreate({
      name: String(form.get('name') || 'Walk-in'),
      partySize: Number(form.get('partySize') || 2),
      duration: Number(form.get('duration') || 90),
    });
  }
  return (
    <div className="admin-overlay modal-overlay" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="walkin-modal" role="dialog" aria-modal="true" aria-labelledby="walkin-title">
        <header className="drawer-topbar"><div><span className="admin-kicker">Entrada sin reserva</span><p>{table.label} · {table.area}</p></div><button className="drawer-close" onClick={onClose}><CloseIcon /></button></header>
        <form onSubmit={submit}>
          <div className="walkin-hero"><i><UserIcon /></i><div><h2 id="walkin-title">Sentar walk-in</h2><p>La ocupación se reflejará inmediatamente en la disponibilidad de sala.</p></div></div>
          <div className="create-form-grid walkin-fields">
            <label className="span-2"><span>Nombre / referencia</span><input name="name" defaultValue="Walk-in" required /></label>
            <label><span>Personas</span><input name="partySize" type="number" min="1" max={table.seats} defaultValue={Math.min(2, table.seats)} required /></label>
            <label><span>Duración estimada</span><select name="duration" defaultValue="90"><option value="75">75 min</option><option value="90">90 min</option><option value="105">105 min</option><option value="120">120 min</option></select></label>
          </div>
          <div className="walkin-table-summary"><TableIcon /><span><strong>{table.label}</strong>{table.seats} plazas · {table.area}</span></div>
          <footer className="create-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button className="admin-primary" type="submit">Sentar ahora</button></footer>
        </form>
      </div>
    </div>
  );
}
