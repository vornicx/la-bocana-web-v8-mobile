'use client';

import { useEffect } from 'react';

export function ExperienceMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    return () => {
      revealObserver?.disconnect();
      heroObserver?.disconnect();
      ctaObserver?.disconnect();
    };
  }, []);

  return <div className="experience-progress" aria-hidden="true"><i /></div>;
}
