'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  { href: '/cocina', label: 'Cocina' },
  { href: '/la-casa', label: 'La casa' },
  { href: '/galeria', label: 'Galería' },
  { href: '/carta', label: 'Carta' },
  { href: '/contacto', label: 'Contacto' },
];

export function PublicHeader({ solid = false }: { solid?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => navigationRef.current?.querySelector<HTMLAnchorElement>('a')?.focus());
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    window.addEventListener('keydown', close);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <header className={`public-header${solid ? ' solid' : ''}${open ? ' menu-open' : ''}`}>
      <Link className="public-brand" href="/" aria-label="La Bocana, inicio">LA BOCANA</Link>
      <nav ref={navigationRef} className="public-nav" id="public-navigation" aria-label="Principal">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
        ))}
      </nav>
      <div className="public-actions">
        <a href="tel:+34952781410">+34 952 781 410</a>
        <Link className="public-book" href="/reservar">Reservar</Link>
        <button ref={menuButtonRef} className="public-menu-button" type="button" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((value) => !value)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}
