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

    return () => revealObserver?.disconnect();
  }, []);

  return null;
}
