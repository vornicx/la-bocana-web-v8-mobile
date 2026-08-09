import type { Metadata } from 'next';
import { PublicPage } from '@/components/public-page';
import { legalDataPending, legalIdentity } from '@/lib/legal';
import { createPublicMetadata } from '@/lib/site';

export const metadata: Metadata = {
  ...createPublicMetadata({ title: 'Privacidad', description: 'Información sobre el tratamiento de datos personales en las reservas de La Bocana.', path: '/privacidad' }),
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <PublicPage eyebrow="Información legal" title="Privacidad, con claridad." intro="Cómo utilizamos los datos necesarios para gestionar una reserva y atenderte antes, durante y después de tu visita." image="/images/photo-6.jpg">
      <article className="legal-copy">
        {legalDataPending && <aside className="legal-review"><strong>Validación obligatoria antes de producción</strong><span>La razón social, el NIF, los datos registrales y el correo legal deben ser confirmados por el titular. No se han dado por válidos basándose únicamente en directorios no oficiales.</span></aside>}
        <aside className="legal-status"><strong>Resumen de primera capa</strong><span>Responsable: {legalIdentity.tradeName}. Finalidad: gestionar reservas, lista de espera y atención asociada. Base: medidas precontractuales, prestación del servicio, obligaciones legales y consentimiento explícito para alergias. Derechos: acceso, rectificación, supresión y demás derechos descritos abajo.</span></aside>
        <section><span>01</span><h2>Responsable</h2><p><strong>Responsable legal:</strong> {legalIdentity.legalName}<br/><strong>NIF/CIF:</strong> {legalIdentity.taxId}<br/><strong>Dirección:</strong> {legalIdentity.address}<br/><strong>Contacto:</strong> <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a> · <a href={legalIdentity.phoneHref}>{legalIdentity.phoneDisplay}</a></p></section>
        <section><span>02</span><h2>Datos tratados</h2><p>Tratamos nombre, apellidos, teléfono, correo, fecha, hora, número de comensales, estado y código de la reserva. Las preferencias, notas y alergias son opcionales. Para proteger el sistema también se tratan datos técnicos mínimos, como identificadores de sesión, marcas de tiempo y señales antifraude.</p></section>
        <section><span>03</span><h2>Finalidades y bases</h2><div><p><strong>Reserva y lista de espera:</strong> gestionar la solicitud, comprobar disponibilidad, confirmar cambios y contactar por incidencias operativas. Base: medidas precontractuales y ejecución del servicio solicitado.</p><p><strong>Alergias o intolerancias:</strong> adaptar la atención y comunicar la información al personal autorizado. Base: consentimiento explícito, separado y revocable.</p><p><strong>Seguridad y responsabilidades:</strong> prevenir abuso, mantener trazabilidad y atender obligaciones legales. Base: interés legítimo en proteger el servicio y cumplimiento normativo.</p></div></section>
        <section><span>04</span><h2>Conservación</h2><p>Los bloqueos de mesa son temporales. Los datos de reservas y lista de espera se conservarán durante la gestión del servicio y, posteriormente, solo durante los plazos necesarios para atender responsabilidades o exigencias legales. Antes de producción, el titular debe ratificar un calendario interno de borrado y revisión periódica.</p></section>
        <section><span>05</span><h2>Destinatarios</h2><p>Accede únicamente el personal autorizado de La Bocana y los proveedores que prestan infraestructura bajo instrucciones del responsable. La base de datos y autenticación utilizan Supabase; el alojamiento web utiliza Vercel. No se venden datos ni se utilizan para publicidad comportamental. Cualquier transferencia internacional deberá quedar cubierta por el mecanismo jurídico y contractual aplicable.</p></section>
        <section><span>06</span><h2>Tus derechos</h2><p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad, así como retirar el consentimiento relativo a datos de salud. Escribe a <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a> indicando tu solicitud y la información necesaria para identificar la reserva. También puedes reclamar ante la <a href="https://www.aepd.es" target="_blank" rel="noreferrer">Agencia Española de Protección de Datos</a>.</p></section>
        <section><span>07</span><h2>Decisiones y menores</h2><p>No se adoptan decisiones automatizadas con efectos jurídicos ni se elaboran perfiles comerciales. La persona que reserva debe ser mayor de edad o contar con capacidad suficiente para realizar la solicitud. Los datos de niños se limitan al número de comensales y necesidades operativas comunicadas por la persona adulta.</p></section>
        <section><span>08</span><h2>Seguridad y cambios</h2><p>Se aplican controles de acceso, validación en servidor, limitación de solicitudes, credenciales separadas y políticas de acceso a base de datos. Esta política se revisará cuando cambien los tratamientos, proveedores o funcionalidades, indicando siempre la fecha de actualización.</p></section>
        <p className="legal-updated">Última revisión: {legalIdentity.lastReview}</p>
      </article>
    </PublicPage>
  );
}
