'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { PublicLocale } from '@/lib/i18n';

const NOTICE_COOKIE = 'lb_privacy_notice';
const NOTICE_MAX_AGE = 60 * 60 * 24 * 180;
const OPEN_EVENT = 'lb:open-cookie-settings';

function rememberNotice() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${NOTICE_COOKIE}=acknowledged; Max-Age=${NOTICE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
}

export function CookieNotice() {
  const pathname = usePathname();
  const locale: PublicLocale = pathname.startsWith('/en') ? 'en' : 'es';
  const copy = locale === 'es' ? {
    privacy: 'Privacidad', close: 'Cerrar', closeLabel: 'Cerrar información sobre cookies', title: 'Solo lo necesario.', description: 'Usamos cookies técnicas para las reservas, el acceso privado y recordar este aviso. Sin analítica, publicidad ni seguimiento.', active: 'Siempre activas', technical: 'Cookies técnicas', technicalText: 'Permiten mantener la sesión del área privada, proteger el servicio y recordar este aviso.', inactive: 'No instaladas', analytics: 'Analítica y publicidad', analyticsText: 'No hay herramientas de seguimiento, perfiles publicitarios ni cookies de marketing configuradas.', understood: 'Entendido', hide: 'Ocultar detalle', show: 'Ver detalle', policy: 'Política de cookies',
  } : {
    privacy: 'Privacy', close: 'Close', closeLabel: 'Close cookie information', title: 'Only what is necessary.', description: 'We use technical cookies for bookings, private access and to remember this notice. No analytics, advertising or tracking.', active: 'Always active', technical: 'Technical cookies', technicalText: 'They maintain private-area sessions, protect the service and remember this notice.', inactive: 'Not installed', analytics: 'Analytics and advertising', analyticsText: 'No tracking tools, advertising profiles or marketing cookies are configured.', understood: 'Understood', hide: 'Hide details', show: 'View details', policy: 'Cookie policy',
  };
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
        <span>{copy.privacy}</span>
        <button type="button" onClick={close} aria-label={copy.closeLabel}>{copy.close}</button>
      </div>
      <div className="cookie-notice-copy">
        <h2 id={titleId}>{copy.title}</h2>
        <p>{copy.description}</p>
      </div>
      <div className="cookie-categories" id={detailsId} hidden={!details}>
          <div><span>{copy.active}</span><strong>{copy.technical}</strong><p>{copy.technicalText}</p></div>
          <div className="inactive"><span>{copy.inactive}</span><strong>{copy.analytics}</strong><p>{copy.analyticsText}</p></div>
      </div>
      <div className="cookie-notice-actions">
        <button className="cookie-primary" type="button" onClick={close}>{copy.understood}</button>
        <button className="cookie-secondary" type="button" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails((value) => !value)}>{details ? copy.hide : copy.show}</button>
        <Link href={locale === 'es' ? '/cookies' : '/en/cookies'} onClick={close}>{copy.policy}</Link>
      </div>
    </section>
  );
}

export function CookieSettingsButton({ locale = 'es' }: { locale?: PublicLocale }) {
  return <button className="footer-cookie-button" type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>{locale === 'es' ? 'Preferencias de privacidad' : 'Privacy preferences'}</button>;
}
