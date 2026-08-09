'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

const NOTICE_COOKIE = 'lb_privacy_notice';
const NOTICE_MAX_AGE = 60 * 60 * 24 * 180;
const OPEN_EVENT = 'lb:open-cookie-settings';

function rememberNotice() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${NOTICE_COOKIE}=acknowledged; Max-Age=${NOTICE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function CookieNotice() {
  const titleId = useId();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    const hasAcknowledged = document.cookie.split('; ').some((entry) => entry.startsWith(`${NOTICE_COOKIE}=`));
    if (!hasAcknowledged) setOpen(true);
    const showSettings = () => { setDetails(true); setOpen(true); };
    window.addEventListener(OPEN_EVENT, showSettings);
    return () => window.removeEventListener(OPEN_EVENT, showSettings);
  }, []);

  function close() {
    rememberNotice();
    setOpen(false);
    setDetails(false);
  }

  if (!open) return null;

  return (
    <section className="cookie-notice" role="region" aria-labelledby={titleId} aria-live="polite">
      <div className="cookie-notice-head">
        <span>Privacidad</span>
        <button type="button" onClick={close} aria-label="Cerrar información sobre cookies">Cerrar</button>
      </div>
      <div className="cookie-notice-copy">
        <h2 id={titleId}>Solo lo necesario.</h2>
        <p>Usamos cookies técnicas para las reservas, el acceso privado y recordar este aviso. Sin analítica, publicidad ni seguimiento.</p>
      </div>
      <div className="cookie-categories" id={detailsId} hidden={!details}>
          <div><span>Siempre activas</span><strong>Cookies técnicas</strong><p>Permiten mantener la sesión del área privada, proteger el servicio y recordar este aviso.</p></div>
          <div className="inactive"><span>No instaladas</span><strong>Analítica y publicidad</strong><p>No hay herramientas de seguimiento, perfiles publicitarios ni cookies de marketing configuradas.</p></div>
      </div>
      <div className="cookie-notice-actions">
        <button className="cookie-primary" type="button" onClick={close}>Entendido</button>
        <button className="cookie-secondary" type="button" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails((value) => !value)}>{details ? 'Ocultar detalle' : 'Ver detalle'}</button>
        <Link href="/cookies" onClick={close}>Política de cookies</Link>
      </div>
    </section>
  );
}

export function CookieSettingsButton() {
  return <button className="footer-cookie-button" type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>Preferencias de privacidad</button>;
}
