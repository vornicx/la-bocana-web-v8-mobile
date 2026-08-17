'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './control-demo-video.module.css';

type ControlDemoVideoProps = {
  variant?: 'card' | 'sidebar' | 'sheet';
  onOpen?: () => void;
};

const VIDEO_SRC = '/videos/demo-la-bocana.mp4';
const POSTER_SRC = '/images/gallery-official/mesa-atardecer.webp';

export function ControlDemoVideo({ variant = 'card', onOpen }: ControlDemoVideoProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
      window.clearTimeout(focusTimer);
      videoRef.current?.pause();
    };
  }, [open]);

  function openVideo() {
    onOpen?.();
    setOpen(true);
  }

  function closeVideo() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  const trigger = variant === 'card'
    ? <button ref={triggerRef} type="button" className={`${styles.trigger} ${styles.card}`} onClick={openVideo}>
        <span className={styles.poster} aria-hidden="true">
          <Image src={POSTER_SRC} alt="" fill sizes="(max-width: 760px) 112px, 128px" />
          <span className={styles.posterShade} />
          <span className={styles.play} />
        </span>
        <span className={styles.copy}>
          <small>Vídeo de demostración</small>
          <strong>Ver cómo funciona Control</strong>
          <span>1:34 min · recorrido guiado</span>
        </span>
        <span className={styles.arrow} aria-hidden="true">→</span>
      </button>
    : variant === 'sidebar'
      ? <button ref={triggerRef} type="button" className={`${styles.trigger} ${styles.sidebar}`} onClick={openVideo}>
          <span className={styles.playSmall} aria-hidden="true" />
          <span className={styles.compactCopy}><strong>Tour de Control</strong><small>Vídeo · 1:34</small></span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </button>
      : <button ref={triggerRef} type="button" className={`${styles.trigger} ${styles.sheet}`} onClick={openVideo}>
          <span className={styles.playSmall} aria-hidden="true" />
          <span className={styles.compactCopy}><strong>Ver demostración</strong><small>Recorrido guiado · 1:34</small></span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </button>;

  return <>
    {trigger}
    {open && typeof document !== 'undefined' && createPortal(
      <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeVideo(); }}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <header className={styles.modalHead}>
            <div>
              <span>La Bocana · Control</span>
              <h2 id={titleId}>Demostración del sistema</h2>
              <p>Un recorrido de 1:34 por la web, el acceso de equipo y las principales herramientas de Control.</p>
            </div>
            <button ref={closeRef} type="button" className={styles.close} onClick={closeVideo} aria-label="Cerrar vídeo">
              <i aria-hidden="true" />
            </button>
          </header>
          <div className={styles.videoFrame}>
            <video ref={videoRef} controls autoPlay playsInline preload="metadata" poster={POSTER_SRC}>
              <source src={VIDEO_SRC} type="video/mp4" />
              Tu navegador no puede reproducir este vídeo.
            </video>
          </div>
          <footer className={styles.modalFooter}>
            <span>Demo protegida</span>
            <p>Después del vídeo puedes entrar con el acceso demo y recorrer Control en modo solo lectura.</p>
          </footer>
        </section>
      </div>,
      document.body
    )}
  </>;
}
