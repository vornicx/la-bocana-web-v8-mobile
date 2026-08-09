'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { alternateLocalePath, chromeCopy, localePaths, type PublicLocale } from '@/lib/i18n';

export function PublicHeader({ solid = false, locale = 'es' }: { solid?: boolean; locale?: PublicLocale }) {
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

  const copy = chromeCopy[locale];
  const paths = localePaths[locale];
  const navigation = [
    { href: paths.menu, label: copy.menu },
    { href: paths.about, label: copy.about },
    { href: paths.gallery, label: copy.gallery },
    { href: paths.contact, label: copy.contact },
  ];

  function rememberLocale() {
    document.cookie = `lb_language=${locale === 'es' ? 'en' : 'es'}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }

  return (
    <header className={`public-header${solid ? ' solid' : ''}${open ? ' menu-open' : ''}`}>
      <Link className="public-brand" href={paths.home} aria-label={copy.homeLabel}><BrandMark compact /></Link>
      <nav ref={navigationRef} className="public-nav" id="public-navigation" aria-label={copy.navLabel}>
        {navigation.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'page' : undefined}>{item.label}</Link>
        ))}
      </nav>
      <div className="public-actions">
        <Link className="public-language" href={alternateLocalePath(pathname, locale)} hrefLang={locale === 'es' ? 'en' : 'es'} lang={locale === 'es' ? 'en' : 'es'} aria-label={copy.language} onClick={rememberLocale}>{locale === 'es' ? 'EN' : 'ES'}</Link>
        <a className="public-phone" href="tel:+34952781410">+34 952 781 410</a>
        <Link className="public-book" href={paths.reserve}>{copy.reserve}</Link>
        <button ref={menuButtonRef} className="public-menu-button" type="button" aria-expanded={open} aria-controls="public-navigation" aria-label={open ? copy.close : copy.open} onClick={() => setOpen((value) => !value)}>
          <span /><span />
        </button>
      </div>
    </header>
  );
}
