import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-brand">LA BOCANA</div>
      <div>© {new Date().getFullYear()} La Bocana · Puerto Banús</div>
      <div><Link href="/contacto">Contacto</Link> · <Link href="/privacidad">Privacidad</Link> · <Link href="/admin">Área privada</Link></div>
    </footer>
  );
}
