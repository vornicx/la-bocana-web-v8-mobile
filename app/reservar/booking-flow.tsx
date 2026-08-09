'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Slot = {
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
};

type Hold = { holdId: string; expiresAt: string; startsAt: string; endsAt: string };

type Confirmation = { confirmationCode: string; status: string; managementToken: string };

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (value: string) => new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(value));
const formatDate = (value: string) => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${value}T12:00:00`));

export default function BookingFlow({ minDate, maxDate }: { minDate: string; maxDate: string }) {
  const [step, setStep] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hold, setHold] = useState<Hold | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [allergies, setAllergies] = useState('');
  const sessionId = useMemo(() => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, []);

  useEffect(() => {
    if (!hold) return;
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(hold.expiresAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [hold]);

  useEffect(() => {
    if (hold && new Date(hold.expiresAt).getTime() <= Date.now() && step === 4) {
      setError('El bloqueo temporal ha caducado. Elige de nuevo una hora para comprobar disponibilidad.');
      setHold(null);
      setStep(3);
    }
  }, [remaining, hold, step]);

  const partySize = adults + children;

  async function loadSlots() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}&adults=${adults}&children=${children}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar la disponibilidad.');
      setSlots(json.slots ?? []);
      setStep(3);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function chooseSlot(slot: Slot) {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/reservations/hold', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, adults, children, serviceId: slot.serviceId, startsAt: slot.startsAt, sessionId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Esa hora ya no está disponible.');
      setRemaining(Math.max(0, Math.floor((new Date(json.expiresAt).getTime() - Date.now()) / 1000)));
      setHold(json); setStep(4);
    } catch (e) {
      const message = (e as Error).message;
      await loadSlots();
      setError(message);
    } finally { setLoading(false); }
  }

  async function releaseCurrentHold() {
    if (!hold) return;
    try { await fetch('/api/reservations/hold', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ holdId: hold.holdId, sessionId }) }); } catch { /* expira solo si falla */ }
    setHold(null);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hold) return;
    setLoading(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          holdId: hold.holdId,
          firstName: form.get('firstName'), lastName: form.get('lastName'),
          phone: form.get('phone'), email: form.get('email'),
          allergies: form.get('allergies'), preferences: form.get('preferences'), notes: form.get('notes'),
          privacyAccepted: form.get('privacyAccepted') === 'on', healthDataConsent: form.get('healthDataConsent') === 'on', companyWebsite: form.get('companyWebsite'),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo confirmar la reserva.');
      setConfirmation(json); setStep(5);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  if (confirmation) {
    return (
      <div className="confirmation-card">
        <div className="confirmation-mark" aria-hidden="true" />
        <span className="eyebrow dark">Reserva recibida</span>
        <h2>Tu mesa está reservada.</h2>
        <p className="confirmation-code">{confirmation.confirmationCode}</p>
        <p>Guarda el código y utiliza el enlace privado para modificar o cancelar tu reserva.</p>
        <a className="primary-button" href={`/reserva/${confirmation.managementToken}`}>Gestionar mi reserva</a>
      </div>
    );
  }

  return (
    <div className="flow">
      <div className="progress-row">
        <span>Reserva</span><strong>{Math.min(step, 4)} de 4</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label="Progreso de la reserva" aria-valuemin={1} aria-valuemax={4} aria-valuenow={Math.min(step, 4)}><i style={{ width: `${Math.min(step, 4) * 25}%` }} /></div>

      {step === 1 && (
        <section className="flow-step" aria-live="polite">
          <span className="eyebrow dark">Tu mesa</span>
          <h2>¿Cuántos seréis?</h2>
          <p className="lead">Indícanos el número de adultos y niños.</p>
          <Counter label="Adultos" value={adults} min={1} max={20} onChange={setAdults} />
          <Counter label="Niños" value={children} min={0} max={12} onChange={setChildren} />
          <button className="primary-button" type="button" onClick={() => setStep(2)}>Continuar · {partySize} {partySize === 1 ? 'persona' : 'personas'}</button>
        </section>
      )}

      {step === 2 && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={() => setStep(1)}><span aria-hidden="true">←</span> Volver</button>
          <span className="eyebrow dark">Fecha</span>
          <h2>¿Cuándo os esperamos?</h2>
          <BocanaCalendar value={date} min={minDate} max={maxDate} onChange={setDate} />
          <div className="selection-summary"><span>{partySize} personas</span><span>·</span><span>{formatDate(date)}</span></div>
          <button className="primary-button" type="button" disabled={loading} onClick={loadSlots}>{loading ? 'Consultando…' : 'Ver horarios'}</button>
        </section>
      )}

      {step === 3 && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={() => setStep(2)}><span aria-hidden="true">←</span> Cambiar fecha</button>
          <span className="eyebrow dark">Horario</span>
          <h2>{formatDate(date)}</h2>
          <p className="lead">{partySize} personas · solo mostramos horas disponibles ahora mismo.</p>
          {slots.length > 0 ? (
            <div className="slot-groups">
              {Object.entries(groupByService(slots)).map(([service, serviceSlots]) => (
                <div key={service} className="slot-group">
                  <h3>{service}</h3>
                  <div className="slots">
                    {serviceSlots.map((slot) => <button type="button" disabled={loading} key={slot.startsAt} onClick={() => chooseSlot(slot)}>{formatTime(slot.startsAt)}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No quedan mesas online para esta fecha.</h3>
              <p>Puedes cambiar el día o apuntarte a la lista de espera para recuperar una cancelación.</p>
              <WaitlistForm date={date} adults={adults} children={children} />
            </div>
          )}
        </section>
      )}

      {step === 4 && hold && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={async () => { await releaseCurrentHold(); setStep(3); }}><span aria-hidden="true">←</span> Cambiar hora</button>
          <span className="eyebrow dark">Tus datos</span>
          <h2>Ya casi está.</h2>
          <div className="hold-banner"><span>Mesa bloqueada temporalmente</span><strong>{Math.floor(remaining / 60)}:{pad(remaining % 60)}</strong></div>
          <div className="booking-recap"><strong>{formatDate(date)}</strong><span>{formatTime(hold.startsAt)} · {partySize} personas</span></div>
          <form onSubmit={confirm} className="details-form"><input className="hp-field" name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="form-grid two"><Field name="firstName" label="Nombre" autoComplete="given-name" /><Field name="lastName" label="Apellidos" autoComplete="family-name" /></div>
            <div className="form-grid two"><Field name="phone" label="Teléfono" type="tel" autoComplete="tel" /><Field name="email" label="Email" type="email" autoComplete="email" /></div>
            <label className="input-label"><span>Alergias o intolerancias · opcional</span><input name="allergies" value={allergies} onChange={(event) => setAllergies(event.target.value)} maxLength={1000} /></label>
            <Field name="preferences" label="Preferencias (terraza, trona, carrito…)" required={false} />
            <label className="textarea-label">Notas para el restaurante<textarea name="notes" rows={3} maxLength={1500} /></label>
            <div className="privacy-first-layer"><strong>Información básica de privacidad</strong><p>La Bocana utilizará tus datos para gestionar la reserva y contactar por cuestiones operativas. La base es la solicitud y prestación del servicio. Puedes ejercer tus derechos según la <a href="/privacidad" target="_blank" rel="noreferrer">política de privacidad<span className="sr-only">, se abre en una pestaña nueva</span></a>.</p></div>
            <label className="check-row"><input type="checkbox" name="privacyAccepted" required /><span>He leído la información de privacidad y las <a href="/condiciones-reserva" target="_blank" rel="noreferrer">condiciones de reserva<span className="sr-only">, se abren en una pestaña nueva</span></a>.</span></label>
            <label className={`check-row health-consent ${allergies.trim() ? '' : 'disabled'}`}><input type="checkbox" name="healthDataConsent" required={allergies.trim().length > 0} disabled={!allergies.trim()} /><span>Si he indicado alergias o intolerancias, consiento expresamente que se traten para preparar y atender mi reserva.</span></label>
            <button className="primary-button" disabled={loading || remaining === 0} type="submit">{loading ? 'Confirmando…' : 'Confirmar reserva'}</button>
          </form>
        </section>
      )}

      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  );
}

function BocanaCalendar({ value, min, max, onChange }: { value: string; min: string; max: string; onChange: (value: string) => void }) {
  const initial = new Date(`${value}T12:00:00`);
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
  const minDate = new Date(`${min}T12:00:00`);
  const maxDate = new Date(`${max}T12:00:00`);
  const monthLabel = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(cursor);
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 12);
  const leading = (first.getDay() + 6) % 7;
  const cells: Array<Date | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day, 12));
  while (cells.length % 7 !== 0) cells.push(null);
  const prevMonth = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
  const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
  const canPrev = prevMonth.getFullYear() > minDate.getFullYear() || (prevMonth.getFullYear() === minDate.getFullYear() && prevMonth.getMonth() >= minDate.getMonth());
  const canNext = nextMonth.getFullYear() < maxDate.getFullYear() || (nextMonth.getFullYear() === maxDate.getFullYear() && nextMonth.getMonth() <= maxDate.getMonth());

  return <div className="bocana-calendar" aria-label="Selecciona una fecha">
    <div className="calendar-toolbar">
      <div><span className="calendar-kicker">Selecciona un día</span><strong>{monthLabel}</strong></div>
      <div className="calendar-arrows"><button type="button" aria-label="Mes anterior" disabled={!canPrev} onClick={() => setCursor(prevMonth)}><span className="calendar-chevron previous" aria-hidden="true" /></button><button type="button" aria-label="Mes siguiente" disabled={!canNext} onClick={() => setCursor(nextMonth)}><span className="calendar-chevron next" aria-hidden="true" /></button></div>
    </div>
    <div className="calendar-weekdays">{['L','M','X','J','V','S','D'].map((day) => <span key={day}>{day}</span>)}</div>
    <div className="calendar-days">{cells.map((day, index) => {
      if (!day) return <span className="calendar-empty" key={`empty-${index}`} />;
      const iso = localDate(day);
      const disabled = day < minDate || day > maxDate;
      const selected = iso === value;
      return <button type="button" key={iso} disabled={disabled} className={selected ? 'selected' : ''} aria-label={formatDate(iso)} aria-pressed={selected} onClick={() => onChange(iso)}><span>{day.getDate()}</span>{selected && <i />}</button>;
    })}</div>
    <div className="calendar-foot"><span><i className="legend-dot" /> Día seleccionado</span><span>La hora se confirma en tiempo real</span></div>
  </div>;
}

function Counter({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return <div className="counter"><span>{label}</span><div><button type="button" aria-label={`Reducir ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button><output aria-live="polite" aria-label={`${label}: ${value}`}>{value}</output><button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button></div></div>;
}

function Field({ name, label, type = 'text', autoComplete, required = true }: { name: string; label: string; type?: string; autoComplete?: string; required?: boolean }) {
  return <label className="input-label"><span>{label}</span><input name={name} type={type} autoComplete={autoComplete} required={required} maxLength={type === 'email' ? 254 : 120} /></label>;
}

function groupByService(slots: Slot[]) {
  return slots.reduce<Record<string, Slot[]>>((groups, slot) => {
    (groups[slot.serviceName] ??= []).push(slot); return groups;
  }, {});
}

function WaitlistForm({ date, adults, children }: { date: string; adults: number; children: number }) {
  const [sent, setSent] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, adults, children, firstName: form.get('firstName'), lastName: form.get('lastName'), phone: form.get('phone'), email: form.get('email'), privacyAccepted: form.get('privacyAccepted') === 'on', companyWebsite: form.get('companyWebsite') }) });
    const json = await response.json();
    if (!response.ok) { setError(json.error || 'No se pudo crear la solicitud.'); return; }
    setSent(true);
  }
  if (sent) return <p className="waitlist-success" role="status">Solicitud registrada en la lista de espera.</p>;
  return <form className="waitlist-form" onSubmit={submit}><input className="hp-field" name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" /><div className="form-grid two"><Field name="firstName" label="Nombre" /><Field name="lastName" label="Apellidos" /></div><div className="form-grid two"><Field name="phone" label="Teléfono" type="tel" /><Field name="email" label="Email" type="email" /></div><div className="privacy-first-layer compact"><strong>Privacidad</strong><p>Usaremos estos datos para gestionar la lista de espera y avisarte sobre esta solicitud. <a href="/privacidad" target="_blank" rel="noreferrer">Más información<span className="sr-only">, se abre en una pestaña nueva</span></a>.</p></div><label className="check-row"><input type="checkbox" name="privacyAccepted" required /><span>He leído la información sobre privacidad.</span></label>{error && <div className="error-box" role="alert">{error}</div>}<button className="secondary-button" type="submit">Entrar en lista de espera</button></form>;
}
