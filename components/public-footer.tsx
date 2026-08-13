import Link from 'next/link';
import { CookieSettingsButton } from '@/components/cookie-notice';
import { BrandMark } from '@/components/brand-mark';
import { chromeCopy, localePaths, type PublicLocale } from '@/lib/i18n';

export function PublicFooter({ locale = 'es' }: { locale?: PublicLocale }) {
  const copy = chromeCopy[locale];
  const paths = localePaths[locale];
  const legalPaths = locale === 'es' ? { legal: '/aviso-legal', privacy: '/privacidad', cookies: '/cookies', terms: '/condiciones-reserva' } : { legal: '/en/legal', privacy: '/en/privacy', cookies: '/en/cookies', terms: '/en/booking-terms' };
  return (
    <footer className="public-footer">
      <div className="footer-identity"><Link className="public-brand" href={paths.home} aria-label={copy.homeLabel}><BrandMark /></Link><p>{locale === 'es' ? 'Cocina mediterránea frente al mar.' : 'Mediterranean cuisine by the sea.'}</p></div>
      <div className="footer-address"><span>{copy.mediterranean}</span><p>Complejo Benabola · Bloque 1<br />Puerto Banús · Marbella</p><a href="tel:+34952781410">+34 952 781 410</a></div>
      <nav aria-label={copy.legal}><Link href={legalPaths.legal}>{copy.legalNotice}</Link><Link href={legalPaths.privacy}>{copy.privacy}</Link><Link href={legalPaths.cookies}>{copy.cookies}</Link><Link href={legalPaths.terms}>{copy.terms}</Link><a href="https://www.instagram.com/restaurantelabocana" target="_blank" rel="noreferrer">Instagram</a><Link href="/control">{locale === 'es' ? 'Acceso equipo' : 'Staff access'}</Link><CookieSettingsButton locale={locale} /></nav>
      <div className="footer-signature">© {new Date().getFullYear()} La Bocana · Puerto Banús</div>
    </footer>
  );
}
