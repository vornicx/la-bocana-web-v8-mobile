'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n';

type Reservation = { confirmationCode: string; status: string; startsAt: string; adults: number; children: number };

export default function LookupForm({ locale = 'es' }: { locale?: PublicLocale }) {
  const es = locale === 'es';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const lang = es ? 'es-ES' : 'en-GB';
  const date = (v: string) => new Intl.DateTimeFormat(lang,{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Madrid'}).format(new Date(v));
  const time = (v: string) => new Intl.DateTimeFormat(lang,{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(new Date(v));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(''); setSearched(false); setReservations([]);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/reservations/lookup', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ name:form.get('name'), phone:form.get('phone'), email:form.get('email') }) });
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.error || (es ? 'No se pudo consultar la reserva.' : 'The booking could not be checked.'));
      setReservations(body.reservations ?? []); setSearched(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setLoading(false); }
  }

  return <div className="lookup-flow">
    <span className="eyebrow dark">{es ? 'Tu reserva' : 'Your booking'}</span>
    <h2>{es ? 'Consulta tu próxima mesa.' : 'Check your next table.'}</h2>
    <p className="lead">{es ? 'Introduce el teléfono y el email usados al reservar. El nombre nos ayuda a comprobar la coincidencia.' : 'Enter the telephone number and email used when booking. The name helps us verify the match.'}</p>
    <form className="lookup-form" onSubmit={submit}>
      <label className="input-label"><span>{es ? 'Nombre de la reserva · opcional' : 'Name on the booking · optional'}</span><input name="name" autoComplete="name" /></label>
      <label className="input-label"><span>{es ? 'Teléfono' : 'Telephone'}</span><input name="phone" type="tel" autoComplete="tel" required /></label>
      <label className="input-label"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
      <button className="primary-button" type="submit" disabled={loading}>{loading ? (es ? 'Consultando…' : 'Checking…') : (es ? 'Consultar reserva' : 'Check booking')}</button>
    </form>
    {error && <div className="error-box" role="alert">{error}</div>}
    {searched && reservations.length === 0 && <div className="lookup-empty" role="status"><h3>{es ? 'No hemos encontrado una reserva próxima con esos datos.' : 'We could not find an upcoming booking with those details.'}</h3><p>{es ? 'Comprueba que estás usando el mismo teléfono y email de la reserva.' : 'Make sure you are using the same telephone number and email as the booking.'}</p></div>}
    {reservations.length > 0 && <section className="lookup-results" aria-live="polite">{reservations.map(r => <article className="lookup-result" key={`${r.confirmationCode}:${r.startsAt}`}><div className="lookup-result-top"><strong>{r.confirmationCode}</strong><span>{r.status}</span></div><div className="lookup-result-grid"><div><span>{es ? 'Fecha' : 'Date'}</span><strong>{date(r.startsAt)}</strong></div><div><span>{es ? 'Hora' : 'Time'}</span><strong>{time(r.startsAt)}</strong></div><div><span>{es ? 'Personas' : 'Guests'}</span><strong>{r.adults + r.children}</strong></div></div></article>)}</section>}
    <div className="lookup-links"><Link href={es ? '/reservar' : '/en/reserve'}>{es ? 'Hacer otra reserva' : 'Make another booking'}</Link><Link href={es ? '/contacto' : '/en/contact'}>{es ? 'Contactar con La Bocana' : 'Contact La Bocana'}</Link></div>
    <p className="lookup-privacy">{es ? 'Solo mostramos la información mínima necesaria para identificar tu reserva.' : 'We only display the minimum information needed to identify your booking.'}</p>
  </div>;
}
