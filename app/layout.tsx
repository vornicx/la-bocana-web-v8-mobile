import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app'),
  title: { default: 'La Bocana | Puerto Banús', template: '%s | La Bocana' },
  description: 'Cocina mediterránea, pescado fresco y arroces frente al mar en Puerto Banús, Marbella.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: 'La Bocana',
    title: 'La Bocana | Puerto Banús',
    description: 'Cocina mediterránea, pescado fresco y arroces frente al mar en Puerto Banús, Marbella.',
    images: [{ url: '/images/photo-2.jpg', alt: 'La Bocana frente al Mediterráneo' }],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const restaurant = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'La Bocana',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app',
    telephone: '+34 952 781 410',
    servesCuisine: ['Mediterránea', 'Andaluza', 'Pescados y mariscos', 'Arroces'],
    address: { '@type': 'PostalAddress', streetAddress: 'Complejo Benabola, Bloque 1', addressLocality: 'Marbella', addressRegion: 'Málaga', addressCountry: 'ES' },
  };
  return <html lang="es"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurant).replace(/</g, '\\u003c') }} /></body></html>;
}
