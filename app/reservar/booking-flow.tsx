'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BocanaCalendar, formatBocanaDate } from '@/components/bocana-calendar';
import type { PublicLocale } from '@/lib/i18n';

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
const formatTime = (value: string, locale: PublicLocale) => new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' }).format(new Date(value));

const bookingCopy = {
  es: {
    expired: 'El bloqueo temporal ha caducado. Elige de nuevo una hora para comprobar disponibilidad.', availabilityError: 'No se pudo consultar la disponibilidad.', slotError: 'Esa hora ya no está disponible.', confirmError: 'No se pudo confirmar la reserva.', received: 'Reserva recibida', reserved: 'Tu mesa está reservada.', confirmationHelp: 'Guarda el código y utiliza el enlace privado para modificar o cancelar tu reserva.', manage: 'Gestionar mi reserva', booking: 'Reserva', of: 'de', progress: 'Progreso de la reserva', yourTable: 'Tu mesa', partyTitle: '¿Cuántos seréis?', partyLead: 'Indícanos el número de adultos y niños.', adults: 'Adultos', children: 'Niños', continue: 'Continuar', person: 'persona', people: 'personas', back: 'Volver', date: 'Fecha', dateTitle: '¿Cuándo os esperamos?', checking: 'Consultando…', schedules: 'Ver horarios', changeDate: 'Cambiar fecha', schedule: 'Horario', availableNow: 'solo mostramos horas disponibles ahora mismo.', noTables: 'No quedan mesas online para esta fecha.', noTablesText: 'Puedes cambiar el día o apuntarte a la lista de espera para recuperar una cancelación.', changeTime: 'Cambiar hora', details: 'Tus datos', almost: 'Ya casi está.', held: 'Mesa bloqueada temporalmente', firstName: 'Nombre', lastName: 'Apellidos', phone: 'Teléfono', email: 'Email', allergies: 'Alergias o intolerancias · opcional', preferences: 'Preferencias (terraza, trona, carrito…)', notes: 'Notas para el restaurante', privacyTitle: 'Información básica de privacidad', privacyText: 'La Bocana utilizará tus datos para gestionar la reserva y contactar por cuestiones operativas. La base es la solicitud y prestación del servicio. Puedes ejercer tus derechos según la', privacyPolicy: 'política de privacidad', privacyAccept: 'He leído la información de privacidad y las', bookingTerms: 'condiciones de reserva', health: 'Si he indicado alergias o intolerancias, consiento expresamente que se traten para preparar y atender mi reserva.', confirming: 'Confirmando…', confirm: 'Confirmar reserva', waitError: 'No se pudo crear la solicitud.', waitSuccess: 'Solicitud registrada en la lista de espera.', privacy: 'Privacidad', waitPrivacy: 'Usaremos estos datos para gestionar la lista de espera y avisarte sobre esta solicitud.', more: 'Más información', privacyRead: 'He leído la información sobre privacidad.', waitButton: 'Entrar en lista de espera', newTab: ', se abre en una pestaña nueva', reduce: 'Reducir', increase: 'Aumentar',
  },
  en: {
    expired: 'Your temporary hold has expired. Choose a time again to check availability.', availabilityError: 'Availability could not be checked.', slotError: 'That time is no longer available.', confirmError: 'The booking could not be confirmed.', received: 'Booking received', reserved: 'Your table is booked.', confirmationHelp: 'Keep this code and use your private link to amend or cancel the booking.', manage: 'Manage my booking', booking: 'Booking', of: 'of', progress: 'Booking progress', yourTable: 'Your table', partyTitle: 'How many guests?', partyLead: 'Tell us the number of adults and children.', adults: 'Adults', children: 'Children', continue: 'Continue', person: 'guest', people: 'guests', back: 'Back', date: 'Date', dateTitle: 'When shall we expect you?', checking: 'Checking…', schedules: 'View times', changeDate: 'Change date', schedule: 'Time', availableNow: 'we only show times currently available.', noTables: 'There are no online tables left for this date.', noTablesText: 'Choose another day or join the waiting list in case of a cancellation.', changeTime: 'Change time', details: 'Your details', almost: 'Almost there.', held: 'Table temporarily held', firstName: 'First name', lastName: 'Last name', phone: 'Telephone', email: 'Email', allergies: 'Allergies or intolerances · optional', preferences: 'Preferences (terrace, high chair, pushchair…)', notes: 'Notes for the restaurant', privacyTitle: 'Essential privacy information', privacyText: 'La Bocana will use your data to manage the booking and contact you about operational matters. The legal basis is your request and delivery of the service. You can exercise your rights under our', privacyPolicy: 'privacy policy', privacyAccept: 'I have read the privacy information and the', bookingTerms: 'booking terms', health: 'If I have entered allergies or intolerances, I expressly consent to their use in preparing and attending to my booking.', confirming: 'Confirming…', confirm: 'Confirm booking', waitError: 'The request could not be created.', waitSuccess: 'Your waiting-list request has been registered.', privacy: 'Privacy', waitPrivacy: 'We will use these details to manage the waiting list and contact you about this request.', more: 'More information', privacyRead: 'I have read the privacy information.', waitButton: 'Join waiting list', newTab: ', opens in a new tab', reduce: 'Reduce', increase: 'Increase',
  },
} as const;

export default function BookingFlow({ minDate, maxDate, locale = 'es' }: { minDate: string; maxDate: string; locale?: PublicLocale }) {
  const t = bookingCopy[locale];
  const formatDate = (value: string) => formatBocanaDate(value, locale);
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
      setError(t.expired);
      setHold(null);
      setStep(3);
    }
  }, [remaining, hold, step, t.expired]);

  const partySize = adults + children;

  async function loadSlots() {
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/reservations/availability?date=${encodeURIComponent(date)}&adults=${adults}&children=${children}`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(locale === 'en' ? t.availabilityError : (json.error || t.availabilityError));
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
      if (!response.ok) throw new Error(locale === 'en' ? t.slotError : (json.error || t.slotError));
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
      if (!response.ok) throw new Error(locale === 'en' ? t.confirmError : (json.error || t.confirmError));
      setConfirmation(json); setStep(5);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  if (confirmation) {
    return (
      <div className="confirmation-card">
        <div className="confirmation-mark" aria-hidden="true" />
        <span className="eyebrow dark">{t.received}</span>
        <h2>{t.reserved}</h2>
        <p className="confirmation-code">{confirmation.confirmationCode}</p>
        <p>{t.confirmationHelp}</p>
        <a className="primary-button" href={`/reserva/${confirmation.managementToken}${locale === 'en' ? '?lang=en' : ''}`}>{t.manage}</a>
      </div>
    );
  }

  return (
    <div className="flow">
      <div className="progress-row">
        <span>{t.booking}</span><strong>{Math.min(step, 4)} {t.of} 4</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={t.progress} aria-valuemin={1} aria-valuemax={4} aria-valuenow={Math.min(step, 4)}><i style={{ width: `${Math.min(step, 4) * 25}%` }} /></div>

      {step === 1 && (
        <section className="flow-step" aria-live="polite">
          <span className="eyebrow dark">{t.yourTable}</span>
          <h2>{t.partyTitle}</h2>
          <p className="lead">{t.partyLead}</p>
          <Counter label={t.adults} value={adults} min={1} max={20} onChange={setAdults} locale={locale} />
          <Counter label={t.children} value={children} min={0} max={12} onChange={setChildren} locale={locale} />
          <button className="primary-button" type="button" onClick={() => setStep(2)}>{t.continue} · {partySize} {partySize === 1 ? t.person : t.people}</button>
        </section>
      )}

      {step === 2 && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={() => setStep(1)}><span aria-hidden="true">←</span> {t.back}</button>
          <span className="eyebrow dark">{t.date}</span>
          <h2>{t.dateTitle}</h2>
          <BocanaCalendar value={date} min={minDate} max={maxDate} onChange={setDate} locale={locale} />
          <div className="selection-summary"><span>{partySize} {partySize === 1 ? t.person : t.people}</span><span>·</span><span>{formatDate(date)}</span></div>
          <button className="primary-button" type="button" disabled={loading} onClick={loadSlots}>{loading ? t.checking : t.schedules}</button>
        </section>
      )}

      {step === 3 && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={() => setStep(2)}><span aria-hidden="true">←</span> {t.changeDate}</button>
          <span className="eyebrow dark">{t.schedule}</span>
          <h2>{formatDate(date)}</h2>
          <p className="lead">{partySize} {partySize === 1 ? t.person : t.people} · {t.availableNow}</p>
          {slots.length > 0 ? (
            <div className="slot-groups">
              {Object.entries(groupByService(slots)).map(([service, serviceSlots]) => (
                <div key={service} className="slot-group">
                  <h3>{service}</h3>
                  <div className="slots">
                    {serviceSlots.map((slot) => <button type="button" disabled={loading} key={slot.startsAt} onClick={() => chooseSlot(slot)}>{formatTime(slot.startsAt, locale)}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>{t.noTables}</h3>
              <p>{t.noTablesText}</p>
              <WaitlistForm date={date} adults={adults} children={children} locale={locale} />
            </div>
          )}
        </section>
      )}

      {step === 4 && hold && (
        <section className="flow-step" aria-live="polite">
          <button className="back-button" type="button" onClick={async () => { await releaseCurrentHold(); setStep(3); }}><span aria-hidden="true">←</span> {t.changeTime}</button>
          <span className="eyebrow dark">{t.details}</span>
          <h2>{t.almost}</h2>
          <div className="hold-banner"><span>{t.held}</span><strong>{Math.floor(remaining / 60)}:{pad(remaining % 60)}</strong></div>
          <div className="booking-recap"><strong>{formatDate(date)}</strong><span>{formatTime(hold.startsAt, locale)} · {partySize} {partySize === 1 ? t.person : t.people}</span></div>
          <form onSubmit={confirm} className="details-form"><input className="hp-field" name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="form-grid two"><Field name="firstName" label={t.firstName} autoComplete="given-name" /><Field name="lastName" label={t.lastName} autoComplete="family-name" /></div>
            <div className="form-grid two"><Field name="phone" label={t.phone} type="tel" autoComplete="tel" /><Field name="email" label={t.email} type="email" autoComplete="email" /></div>
            <label className="input-label"><span>{t.allergies}</span><input name="allergies" value={allergies} onChange={(event) => setAllergies(event.target.value)} maxLength={1000} /></label>
            <Field name="preferences" label={t.preferences} required={false} />
            <label className="textarea-label">{t.notes}<textarea name="notes" rows={3} maxLength={1500} /></label>
            <div className="privacy-first-layer"><strong>{t.privacyTitle}</strong><p>{t.privacyText} <a href={locale === 'es' ? '/privacidad' : '/en/privacy'} target="_blank" rel="noreferrer">{t.privacyPolicy}<span className="sr-only">{t.newTab}</span></a>.</p></div>
            <label className="check-row"><input type="checkbox" name="privacyAccepted" required /><span>{t.privacyAccept} <a href={locale === 'es' ? '/condiciones-reserva' : '/en/booking-terms'} target="_blank" rel="noreferrer">{t.bookingTerms}<span className="sr-only">{t.newTab}</span></a>.</span></label>
            <label className={`check-row health-consent ${allergies.trim() ? '' : 'disabled'}`}><input type="checkbox" name="healthDataConsent" required={allergies.trim().length > 0} disabled={!allergies.trim()} /><span>{t.health}</span></label>
            <button className="primary-button" disabled={loading || remaining === 0} type="submit">{loading ? t.confirming : t.confirm}</button>
          </form>
        </section>
      )}

      {error && <div className="error-box" role="alert">{error}</div>}
    </div>
  );
}

function Counter({ label, value, min, max, onChange, locale }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; locale: PublicLocale }) {
  const t = bookingCopy[locale];
  return <div className="counter"><span>{label}</span><div><button type="button" aria-label={`${t.reduce} ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button><output aria-live="polite" aria-label={`${label}: ${value}`}>{value}</output><button type="button" aria-label={`${t.increase} ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button></div></div>;
}

function Field({ name, label, type = 'text', autoComplete, required = true }: { name: string; label: string; type?: string; autoComplete?: string; required?: boolean }) {
  return <label className="input-label"><span>{label}</span><input name={name} type={type} autoComplete={autoComplete} required={required} maxLength={type === 'email' ? 254 : 120} /></label>;
}

function groupByService(slots: Slot[]) {
  return slots.reduce<Record<string, Slot[]>>((groups, slot) => {
    (groups[slot.serviceName] ??= []).push(slot); return groups;
  }, {});
}

function WaitlistForm({ date, adults, children, locale }: { date: string; adults: number; children: number; locale: PublicLocale }) {
  const t = bookingCopy[locale];
  const [sent, setSent] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ date, adults, children, firstName: form.get('firstName'), lastName: form.get('lastName'), phone: form.get('phone'), email: form.get('email'), privacyAccepted: form.get('privacyAccepted') === 'on', companyWebsite: form.get('companyWebsite') }) });
    const json = await response.json();
    if (!response.ok) { setError(locale === 'en' ? t.waitError : (json.error || t.waitError)); return; }
    setSent(true);
  }
  if (sent) return <p className="waitlist-success" role="status">{t.waitSuccess}</p>;
  return <form className="waitlist-form" onSubmit={submit}><input className="hp-field" name="companyWebsite" tabIndex={-1} autoComplete="off" aria-hidden="true" /><div className="form-grid two"><Field name="firstName" label={t.firstName} /><Field name="lastName" label={t.lastName} /></div><div className="form-grid two"><Field name="phone" label={t.phone} type="tel" /><Field name="email" label={t.email} type="email" /></div><div className="privacy-first-layer compact"><strong>{t.privacy}</strong><p>{t.waitPrivacy} <a href={locale === 'es' ? '/privacidad' : '/en/privacy'} target="_blank" rel="noreferrer">{t.more}<span className="sr-only">{t.newTab}</span></a>.</p></div><label className="check-row"><input type="checkbox" name="privacyAccepted" required /><span>{t.privacyRead}</span></label>{error && <div className="error-box" role="alert">{error}</div>}<button className="secondary-button" type="submit">{t.waitButton}</button></form>;
}
