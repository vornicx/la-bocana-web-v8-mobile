'use client';

import { useEffect, useRef, useState } from 'react';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!video) return;

    const syncMotionPreference = () => {
      if (reducedMotion.matches) {
        video.pause();
        setPaused(true);
        return;
      }

      void video.play().then(() => setPaused(false)).catch(() => setPaused(true));
    };

    syncMotionPreference();
    reducedMotion.addEventListener('change', syncMotionPreference);
    return () => reducedMotion.removeEventListener('change', syncMotionPreference);
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().then(() => setPaused(false)).catch(() => setPaused(true));
      return;
    }

    video.pause();
    setPaused(true);
  };

  return (
    <div className="public-hero-media">
      <video
        ref={videoRef}
        className="public-hero-video"
        muted
        loop
        playsInline
        preload="metadata"
        poster="/images/hero-video-poster.webp"
        aria-hidden="true"
        tabIndex={-1}
        onPause={() => setPaused(true)}
        onPlay={() => setPaused(false)}
      >
        <source src="/videos/recuerdos-la-bocana-hero-v1.mp4" type="video/mp4" />
      </video>
      <button
        className={`hero-video-control${paused ? ' is-paused' : ''}`}
        type="button"
        onClick={togglePlayback}
        aria-label={paused ? 'Reproducir vídeo de La Bocana' : 'Pausar vídeo de La Bocana'}
      >
        <span className="hero-video-control-icon" aria-hidden="true" />
        <span>{paused ? 'Reproducir' : 'Pausar'}</span>
      </button>
    </div>
  );
}
