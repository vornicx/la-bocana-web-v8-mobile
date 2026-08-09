import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

export const metadata: Metadata = { title: 'Página no encontrada', robots: { index: false, follow: false, noarchive: true } };

export default function NotFound() {
  return <div className="public-site"><PublicHeader solid /><main id="main-content"><section className="not-found"><span>Error 404</span><h1>Esta mesa no existe.</h1><p>La página que buscas ha cambiado de sitio o ya no está disponible.</p><div><Link className="reserve-main" href="/">Volver al inicio</Link><Link className="reserve-secondary dark" href="/reservar">Reservar mesa</Link></div></section></main><PublicFooter /></div>;
}
