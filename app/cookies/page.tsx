import type { Metadata } from 'next';
import { PublicPage } from '@/components/public-page';
import { legalIdentity } from '@/lib/legal';

export const metadata: Metadata = {
  title: 'Política de cookies',
  description: 'Cookies y tecnologías técnicas utilizadas por el sitio web de La Bocana.',
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return (
    <PublicPage eyebrow="Privacidad digital" title="Solo lo necesario." intro="Una explicación directa de qué se guarda en tu dispositivo, por qué y durante cuánto tiempo." image="/images/sobremesa-la-bocana-real.jpeg">
      <article className="legal-copy">
        <aside className="legal-status"><strong>Sin seguimiento comercial</strong><span>Actualmente no utilizamos Google Analytics, Meta Pixel, publicidad comportamental ni herramientas equivalentes. Si esto cambia, se bloquearán hasta obtener una elección válida.</span></aside>
        <section><span>01</span><h2>Qué es una cookie</h2><p>Una cookie es un pequeño archivo que el navegador conserva para recordar información necesaria entre visitas o solicitudes. Tecnologías similares pueden cumplir funciones equivalentes. Las cookies estrictamente técnicas pueden utilizarse sin consentimiento cuando son imprescindibles para prestar el servicio solicitado.</p></section>
        <section><span>02</span><h2>Inventario actual</h2><div className="legal-table-wrap"><table className="legal-table"><thead><tr><th>Nombre</th><th>Responsable</th><th>Finalidad</th><th>Duración</th></tr></thead><tbody><tr><td>lb_privacy_notice</td><td>La Bocana</td><td>Recordar que se ha mostrado el aviso informativo.</td><td>180 días</td></tr><tr><td>sb-…-auth-token y posibles fragmentos</td><td>Supabase / La Bocana</td><td>Mantener y renovar la sesión autenticada del personal en el área privada.</td><td>Sesión y renovación técnica</td></tr></tbody></table></div></section>
        <section><span>03</span><h2>Base y configuración</h2><p>Estas cookies son técnicas y se usan para prestar funciones expresamente solicitadas o proteger el acceso privado. Puedes bloquearlas desde el navegador, aunque el área privada y determinadas funciones pueden dejar de operar correctamente.</p></section>
        <section><span>04</span><h2>Nuevos proveedores</h2><p>Una futura herramienta de analítica, vídeo incrustado o publicidad no podrá activarse antes de informar de su finalidad, proveedor, duración y transferencias, y de obtener consentimiento cuando sea exigible. Rechazar deberá ser tan sencillo como aceptar.</p></section>
        <section><span>05</span><h2>Contacto</h2><p>Para cualquier consulta sobre esta política puedes escribir a <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a> o utilizar los datos publicados en el aviso legal.</p></section>
        <p className="legal-updated">Última revisión: {legalIdentity.lastReview}</p>
      </article>
    </PublicPage>
  );
}
