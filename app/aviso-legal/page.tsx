import type { Metadata } from 'next';
import { PublicPage } from '@/components/public-page';
import { legalDataPending, legalIdentity } from '@/lib/legal';
import { createPublicMetadata } from '@/lib/site';

export const metadata: Metadata = {
  ...createPublicMetadata({ title: 'Aviso legal', description: 'Identificación, titularidad y condiciones de uso del sitio web de La Bocana.', path: '/aviso-legal' }),
  robots: { index: false, follow: true },
};

export default function LegalNoticePage() {
  return (
    <PublicPage eyebrow="Información legal" title="Transparencia desde el principio." intro="Quién está detrás de esta web, qué reglas rigen su uso y cómo contactar con el restaurante." image="/images/pescado-mediterraneo-la-bocana.jpeg">
      <article className="legal-copy">
        {legalDataPending && <aside className="legal-review"><strong>Validación obligatoria antes de producción</strong><span>La razón social, el NIF, los datos registrales y el correo legal no aparecen juntos en una fuente pública suficientemente fiable. Deben ser confirmados por el titular antes del lanzamiento comercial. El diseño y el resto del contenido legal ya están preparados.</span></aside>}
        <section><span>01</span><h2>Titular del sitio</h2><div><p><strong>Nombre comercial:</strong> {legalIdentity.tradeName}<br/><strong>Razón social:</strong> {legalIdentity.legalName}<br/><strong>NIF/CIF:</strong> {legalIdentity.taxId}<br/><strong>Registro:</strong> {legalIdentity.registry}</p><p><strong>Domicilio:</strong> {legalIdentity.address}<br/><strong>Teléfono:</strong> <a href={legalIdentity.phoneHref}>{legalIdentity.phoneDisplay}</a><br/><strong>Correo:</strong> <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a></p></div></section>
        <section><span>02</span><h2>Objeto</h2><p>El sitio informa sobre La Bocana y permite consultar su propuesta gastronómica, contactar con el restaurante y solicitar, gestionar o cancelar reservas. La navegación implica aceptar estas condiciones en lo que resulte aplicable.</p></section>
        <section><span>03</span><h2>Uso responsable</h2><p>El usuario se compromete a facilitar información veraz, utilizar el servicio de buena fe y no intentar alterar su seguridad, disponibilidad o funcionamiento. Las reservas falsas, automatizadas o abusivas podrán ser rechazadas.</p></section>
        <section><span>04</span><h2>Contenido y propiedad</h2><p>Los textos, fotografías, identidad visual, diseño y código están protegidos por la normativa aplicable. No se autoriza su explotación comercial, reproducción sustancial o transformación sin permiso del titular o del correspondiente propietario de los derechos.</p></section>
        <section><span>05</span><h2>Disponibilidad y enlaces</h2><p>Se trabaja para mantener la información y el sistema disponibles y actualizados, pero pueden producirse interrupciones justificadas. Los enlaces externos se facilitan como referencia; sus contenidos y políticas dependen de sus respectivos titulares.</p></section>
        <section><span>06</span><h2>Ley aplicable</h2><p>Este sitio se rige por la legislación española. Cuando la persona usuaria sea consumidora, cualquier controversia se resolverá conforme a las normas imperativas de protección de consumidores y al fuero que legalmente corresponda.</p></section>
        <p className="legal-updated">Última revisión: {legalIdentity.lastReview}</p>
      </article>
    </PublicPage>
  );
}
