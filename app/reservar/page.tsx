import Image from 'next/image';
import BookingFlow from './booking-flow';

export const metadata = { title: 'Reservar mesa', description: 'Reserva tu mesa en La Bocana con disponibilidad confirmada en tiempo real.' };

function madridDate() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function ReservationPage() {
  const minDate = madridDate();
  return (
    <main className="booking-page">
      <section className="booking-visual" aria-hidden="true">
        <Image src="/images/mesa-frente-al-mar.jpg" alt="" fill priority sizes="(max-width: 900px) 100vw, 44vw" />
        <div className="visual-shade" />
        <div className="visual-copy">
          <span className="eyebrow">Puerto Banús · Marbella</span>
          <h1>Una mesa<br />frente al Mediterráneo.</h1>
          <p>Desde 1987, producto, cocina y sobremesa junto al mar.</p>
        </div>
      </section>
      <section className="booking-panel">
        <div className="brand-row">
          <div className="wordmark">LA BOCANA</div>
          <span>RESERVAS</span>
        </div>
        <BookingFlow minDate={minDate} maxDate={addDays(minDate, 90)} />
        <p className="privacy-footnote">La disponibilidad se confirma en tiempo real al elegir la hora.</p>
      </section>
    </main>
  );
}
