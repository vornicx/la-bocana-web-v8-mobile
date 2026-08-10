import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { CookieNotice } from '@/components/cookie-notice';
import { DEFAULT_SOCIAL_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';
import './experience.css';
import './experience-fixes.css';
import './mobile-refinement.css';
import './lookup.css';
import './mobile-header.css';
import './mobile-menu.css';
import './mobile-layout.css';
import './mobile-footer-fix.css';
import './mobile-booking.css';
import { headers } from 'next/headers';
import { chromeCopy, type PublicLocale } from '@/lib/i18n';

const bocanaSerif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-bocana-serif',
});

const bocanaSans = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-bocana-sans',
});

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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = ((await headers()).get('x-lb-locale') === 'en' ? 'en' : 'es') as PublicLocale;
  return <html lang={locale} className={`${bocanaSerif.variable} ${bocanaSans.variable}`}><body><a className="skip-link" href="#main-content">{chromeCopy[locale].skip}</a>{children}<CookieNotice /></body></html>;
}
