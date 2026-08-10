import type { Metadata } from 'next';
import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { ArtDirectedImage } from '@/components/art-directed-image';
import LookupForm from './lookup-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Consultar reserva', robots: { index: false, follow: false, noarchive: true } };

export function LookupPageContent({ locale = 'es' }: { locale?: 'es' | 'en' }) {
  const es = locale === 'es';
  return <main className="booking-page lookup-page" id="main-content">
    <section className="booking-visual">
      <ArtDirectedImage desktop="/images/gallery-official/mesa-vista.webp" mobile="/images/curated/mesa-vista-mobile.webp" alt={es ? 'Mesa frente al Mediterráneo en La Bocana' : 'A table overlooking the Mediterranean at La Bocana'} priority />
      <div className="visual-shade" />
      <div className="visual-copy"><span className="eyebrow">Puerto Banús · Marbella</span><h1>{es ? <>Tu mesa,<br/>a un paso.</> : <>Your table,<br/>one step away.</>}</h1><p>{es ? 'Consulta los detalles de tu próxima reserva.' : 'Check the details of your upcoming booking.'}</p></div>
    </section>
    <section className="booking-panel">
      <div className="brand-row"><Link href={es ? '/' : '/en'} aria-label={es ? 'Volver a la web' : 'Back to the website'}><BrandMark compact /></Link><span>{es ? 'Consultar reserva' : 'Check booking'}</span><Link className="booking-language" href={es ? '/en/check-booking' : '/consultar-reserva'}>{es ? 'EN' : 'ES'}</Link></div>
      <LookupForm locale={locale} />
    </section>
  </main>;
}

export default function LookupPage() { return <LookupPageContent />; }
