import Link from 'next/link';
import { CookieSettingsButton } from '@/components/cookie-notice';
import { BrandMark } from '@/components/brand-mark';

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-brand"><BrandMark /></div>
      <div>© {new Date().getFullYear()} La Bocana · Puerto Banús</div>
      <nav aria-label="Información legal"><Link href="/aviso-legal">Aviso legal</Link><Link href="/privacidad">Privacidad</Link><Link href="/cookies">Cookies</Link><Link href="/condiciones-reserva">Condiciones</Link><CookieSettingsButton /></nav>
    </footer>
  );
}
