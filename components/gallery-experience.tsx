'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { PublicLocale } from '@/lib/i18n';

export type GalleryImage = { src: string; alt: string; shape: string };

export function GalleryExperience({ images, locale = 'es' }: { images: GalleryImage[]; locale?: PublicLocale }) {
  const [active, setActive] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const t = locale === 'es' ? { open: 'Ampliar imagen', close: 'Cerrar galería', previous: 'Imagen anterior', next: 'Imagen siguiente', dialog: 'Galería de La Bocana' } : { open: 'Enlarge image', close: 'Close gallery', previous: 'Previous image', next: 'Next image', dialog: 'La Bocana gallery' };

  useEffect(() => {
    if (active === null) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
      if (event.key === 'ArrowLeft') setActive((value) => value === null ? null : (value - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') setActive((value) => value === null ? null : (value + 1) % images.length);
    };
    window.addEventListener('keydown', keyboard);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', keyboard); };
  }, [active, images.length]);

  return <>
    <div className="gallery-curation">
      {images.map((image, index) => (
        <figure className={image.shape} key={image.src} data-reveal>
          <button type="button" onClick={() => setActive(index)} aria-label={`${t.open}: ${image.alt}`}>
            <Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" />
            <figcaption>{String(index + 1).padStart(2, '0')} · La Bocana</figcaption>
          </button>
        </figure>
      ))}
    </div>
    {active !== null && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={t.dialog}>
      <button ref={closeRef} className="gallery-lightbox-close" type="button" onClick={() => setActive(null)} aria-label={t.close}>×</button>
      <button className="gallery-lightbox-previous" type="button" aria-label={t.previous} onClick={() => setActive((active - 1 + images.length) % images.length)}><span aria-hidden="true">←</span></button>
      <div className="gallery-lightbox-image"><Image src={images[active].src} alt={images[active].alt} fill priority sizes="100vw" /></div>
      <div className="gallery-lightbox-meta"><span>{String(active + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}</span><p>{images[active].alt}</p></div>
      <button className="gallery-lightbox-next" type="button" aria-label={t.next} onClick={() => setActive((active + 1) % images.length)}><span aria-hidden="true">→</span></button>
    </div>}
  </>;
}
