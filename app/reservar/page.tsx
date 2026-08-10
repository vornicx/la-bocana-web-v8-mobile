import BookingFlow from './booking-flow';
import { createPublicMetadata } from '@/lib/site';
import { ArtDirectedImage } from '@/components/art-directed-image';
import { BrandMark } from '@/components/brand-mark';
import Link from 'next/link';
import type { PublicLocale } from '@/lib/i18n';

export const metadata = createPublicMetadata({ title: 'Reservar mesa', description: 'Reserva tu mesa en La Bocana con disponibilidad confirmada en tiempo real.', path: '/reservar', alternatePath: '/en/reserve', image: '/images/gallery-official/mesa-vista.webp' });

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

export function ReservationPageContent({ locale = 'es' }: { locale?: PublicLocale }) {
  const minDate = madridDate();
  const t = locale === 'es' ? { eyebrow: 'Puerto Banús · Marbella', title: <>Una mesa<br />frente al Mediterráneo.</>, text: 'Producto, cocina y sobremesa junto al mar.', label: 'Reservas', back: 'Volver a la web', language: 'EN', languageHref: '/en/reserve', realtime: 'La disponibilidad se confirma en tiempo real al elegir la hora.', existing: '¿Ya tienes una reserva?', lookup: 'Consultar mi reserva', lookupHref: '/consultar-reserva' } : { eyebrow: 'Puerto Banús · Marbella', title: <>A table<br />by the Mediterranean.</>, text: 'Produce, cuisine and long lunches by the sea.', label: 'Bookings', back: 'Back to the website', language: 'ES', languageHref: '/reservar', realtime: 'Availability is confirmed in real time when you choose a time.', existing: 'Already have a booking?', lookup: 'Check my booking', lookupHref: '/en/check-booking' };
  return (
    <main className="booking-page" id="main-content">
      <section className="booking-visual">
        <ArtDirectedImage desktop="/images/gallery-official/mesa-atardecer.webp" mobile="/images/curated/mesa-vista-mobile.webp" alt={locale === 'es' ? 'Mesa preparada al atardecer frente al Mediterráneo en La Bocana' : 'A table set at sunset overlooking the Mediterranean at La Bocana'} priority />
        <div className="visual-shade" />
        <div className="visual-copy">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.text}</p>
        </div>
      </section>
      <section className="booking-panel">
        <div className="brand-row">
          <Link href={locale === 'es' ? '/' : '/en'} aria-label={t.back}><BrandMark compact /></Link>
          <span>{t.label}</span>
          <Link className="booking-language" href={t.languageHref} hrefLang={locale === 'es' ? 'en' : 'es'}>{t.language}</Link>
        </div>
        <BookingFlow minDate={minDate} maxDate={addDays(minDate, 90)} locale={locale} />
        <div className="existing-booking"><span>{t.existing}</span><Link href={t.lookupHref}>{t.lookup}<span aria-hidden="true"> →</span></Link></div>
        <p className="privacy-footnote">{t.realtime}</p>
      </section>
    </main>
  );
}

export default function ReservationPage() {
  return <ReservationPageContent />;
}
