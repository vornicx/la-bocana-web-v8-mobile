import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CookieNotice } from '@/components/cookie-notice';
import { DEFAULT_SOCIAL_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: 'La Bocana frente al Mediterráneo' }],
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION, images: [DEFAULT_SOCIAL_IMAGE] },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="es"><body><a className="skip-link" href="#main-content">Saltar al contenido principal</a>{children}<CookieNotice /></body></html>;
}
