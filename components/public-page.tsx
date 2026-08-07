import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function PublicPage({ eyebrow, title, intro, image, children }: { eyebrow: string; title: string; intro: string; image: string; children: ReactNode }) {
  return <main className="public-site public-subpage">
    <header className="public-header solid"><Link className="public-brand" href="/">LA BOCANA</Link><nav className="public-nav"><Link href="/cocina">Cocina</Link><Link href="/la-casa">La casa</Link><Link href="/galeria">Galería</Link><Link href="/carta">Carta</Link></nav><div className="public-actions"><Link className="public-book" href="/reservar">Reservar</Link></div></header>
    <section className="subpage-hero"><div className="subpage-copy"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div><div className="subpage-image"><Image src={image} alt="" fill priority sizes="50vw" /></div></section>
    <section className="subpage-body">{children}</section>
    <section className="subpage-reserve"><span>Tu mesa</span><h2>Una mesa junto al Mediterráneo.</h2><Link href="/reservar">Reservar →</Link></section>
    <footer className="public-footer"><div className="public-brand">LA BOCANA</div><div>Puerto Banús · Marbella</div><div><Link href="/">Inicio</Link> · <Link href="/contacto">Contacto</Link></div></footer>
  </main>;
}
