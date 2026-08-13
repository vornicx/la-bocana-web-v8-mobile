import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { chromeCopy, localePaths, type PublicLocale } from '@/lib/i18n';
import { ExperienceMotion } from '@/components/experience-motion';
import { ArtDirectedImage } from '@/components/art-directed-image';

export function PublicPage({ eyebrow, title, intro, image, mobileImage, imageAlt, locale = 'es', children }: { eyebrow: string; title: string; intro: string; image: string; mobileImage?: string; imageAlt?: string; locale?: PublicLocale; children: ReactNode }) {
  const copy = chromeCopy[locale];
  return <div className="public-site public-subpage">
    <ExperienceMotion />
    <PublicHeader solid locale={locale} />
    <main id="main-content">
      <section className="subpage-hero"><div className="subpage-copy" data-reveal><span>{eyebrow}</span><h1>{title}</h1><p>{intro}</p></div><div className="subpage-image"><ArtDirectedImage desktop={image} mobile={mobileImage || image} alt={imageAlt || ''} priority sizes="(max-width: 700px) 100vw, 52vw" /><span className="image-caption">La Bocana · Puerto Banús</span></div></section>
      <section className="subpage-body">{children}</section>
      <section className="subpage-reserve" data-reveal><span>{copy.table}</span><h2>{copy.reserveTitle}</h2><Link href={localePaths[locale].reserve}>{copy.reserveButton}</Link></section>
    </main>
    <PublicFooter locale={locale} />
  </div>;
}
