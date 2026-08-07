import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app'),
  title: { default: 'La Bocana | Puerto Banús', template: '%s | La Bocana' },
  description: 'Cocina mediterránea, pescado fresco y arroces frente al mar en Puerto Banús, Marbella.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
