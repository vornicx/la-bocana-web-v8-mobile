'use client';

import { useEffect } from 'react';

export function ExperienceMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const home = document.querySelector<HTMLElement>('.experience-home');
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (home) home.dataset.ready = 'true';
      });
    });

    let revealObserver: IntersectionObserver | null = null;
    if (reduced) {
      elements.forEach((element) => element.dataset.visible = 'true');
    } else {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.visible = 'true';
          revealObserver?.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -9% 0px', threshold: 0.09 });
      elements.forEach((element) => revealObserver?.observe(element));
    }

    const dock = document.querySelector<HTMLElement>('.mobile-reserve-dock');
    const hero = document.querySelector<HTMLElement>('.experience-hero');
    const pause = document.querySelector<HTMLElement>('.experience-pause');
    const reserveCtas = Array.from(document.querySelectorAll<HTMLElement>(
      '.experience-primary, .experience-end .reserve-main, .public-header .public-book'
    ));

    let heroVisible = true;
    const visibleReserveCtas = new Set<Element>();

    const syncDock = () => {
      if (!dock) return;
      const shouldShow = !heroVisible && visibleReserveCtas.size === 0;
      dock.dataset.visible = shouldShow ? 'true' : 'false';
      dock.setAttribute('aria-hidden', shouldShow ? 'false' : 'true');
    };

    let heroObserver: IntersectionObserver | null = null;
    let ctaObserver: IntersectionObserver | null = null;

    if (dock && hero) {
      heroObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => { heroVisible = entry.isIntersecting; });
        syncDock();
      }, { threshold: 0.01 });

      ctaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleReserveCtas.add(entry.target);
          else visibleReserveCtas.delete(entry.target);
        });
        syncDock();
      }, { threshold: 0.18 });

      dock.dataset.visible = 'false';
      dock.setAttribute('aria-hidden', 'true');
      heroObserver.observe(hero);
      reserveCtas.forEach((cta) => ctaObserver?.observe(cta));
      syncDock();
    }

    let ticking = false;
    const updateDepth = () => {
      ticking = false;
      if (reduced || !finePointer || window.innerWidth < 901) return;

      if (hero) {
        const rect = hero.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)));
        hero.style.setProperty('--lb-hero-shift', `${progress * 34}px`);
        hero.style.setProperty('--lb-hero-copy-shift', `${progress * 12}px`);
      }

      if (pause) {
        const rect = pause.getBoundingClientRect();
        const viewport = window.innerHeight;
        const progress = (viewport - rect.top) / Math.max(1, viewport + rect.height);
        const normalized = Math.min(1, Math.max(0, progress));
        pause.style.setProperty('--lb-pause-shift', `${(normalized - .5) * 30}px`);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateDepth);
    };

    if (!reduced && finePointer) {
      updateDepth();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
    }

    return () => {
      revealObserver?.disconnect();
      heroObserver?.disconnect();
      ctaObserver?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return <div className="experience-progress" aria-hidden="true"><i /></div>;
}
