'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

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

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className={`public-header${solid ? ' solid' : ''}${open ? ' menu-open' : ''}`}>
      <Link className="public-brand" href="/" aria-label="La Bocana, inicio">LA BOCANA</Link>
      <nav className="public-nav" id="public-navigation" aria-label="Principal">
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>
        ))}
      </nav>
      <div className="public-actions">
        <a href="tel:+34952781410">+34 952 781 410</a>
        <Link className="public-book" href="/reservar">Reservar</Link>
        <button className="public-menu-button" type="button" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen((value) => !value)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}
