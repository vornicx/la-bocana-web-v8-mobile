import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

export function PublicPage({ eyebrow, title, intro, image, children }: { eyebrow: string; title: string; intro: string; image: string; children: ReactNode }) {
  return <div className="public-site public-subpage">
    <PublicHeader solid />
    <main id="main-content">
      <section className="subpage-hero"><div className="subpage-copy"><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div><div className="subpage-image"><Image src={image} alt="" fill priority sizes="50vw" /></div></section>
      <section className="subpage-body">{children}</section>
      <section className="subpage-reserve"><span>Tu mesa</span><h2>Una mesa junto al Mediterráneo.</h2><Link href="/reservar">Reservar</Link></section>
    </main>
    <PublicFooter />
  </div>;
}
