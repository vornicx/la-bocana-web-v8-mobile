import Image from 'next/image';
import BookingFlow from './booking-flow';

export default function ReservationPage() {
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
        <BookingFlow />
        <p className="privacy-footnote">La disponibilidad se confirma en tiempo real al elegir la hora.</p>
      </section>
    </main>
  );
}
