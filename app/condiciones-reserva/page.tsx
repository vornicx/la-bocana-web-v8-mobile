import type { Metadata } from 'next';
import { PublicPage } from '@/components/public-page';
import { legalIdentity } from '@/lib/legal';
import { createPublicMetadata } from '@/lib/site';

export const metadata: Metadata = {
  ...createPublicMetadata({ title: 'Condiciones de reserva', description: 'Funcionamiento, modificación y cancelación de las reservas online de La Bocana.', path: '/condiciones-reserva' }),
  robots: { index: false, follow: true },
};

export default function BookingTermsPage() {
  return (
    <PublicPage eyebrow="Reservas online" title="Tu mesa, con claridad." intro="Qué ocurre desde que eliges una hora hasta que recibes la confirmación de tu reserva." image="/images/pescado-mediterraneo-la-bocana.jpeg">
      <article className="legal-copy">
        <section><span>01</span><h2>Solicitud y confirmación</h2><p>La disponibilidad se comprueba en tiempo real. Elegir una hora crea un bloqueo temporal, pero la reserva solo queda confirmada cuando el sistema muestra un código de confirmación. Si el bloqueo caduca, deberá elegirse de nuevo una hora.</p></section>
        <section><span>02</span><h2>Datos correctos</h2><p>La persona que reserva debe facilitar datos de contacto correctos y un número real de comensales. El restaurante puede contactar únicamente para cuestiones operativas relacionadas con la reserva.</p></section>
        <section><span>03</span><h2>Cambios y cancelaciones</h2><p>El enlace privado de gestión permite consultar, modificar o cancelar la reserva mientras esta admita cambios. Si no puedes acudir, agradecemos la cancelación con la mayor antelación posible para liberar la mesa.</p></section>
        <section><span>04</span><h2>Retrasos y disponibilidad</h2><p>La asignación de zona o mesa concreta depende de la operativa del servicio y no queda garantizada salvo confirmación expresa. Las preferencias se tendrán en cuenta siempre que sea posible. El margen de cortesía por retraso deberá ser confirmado por el restaurante antes de publicar una cifra vinculante.</p></section>
        <section><span>05</span><h2>Alergias</h2><p>Las alergias o intolerancias se comunican voluntariamente y requieren consentimiento explícito para su tratamiento. Esta información ayuda a preparar la atención, pero no sustituye la conversación con el equipo al llegar ni garantiza por sí sola la ausencia absoluta de trazas.</p></section>
        <section><span>06</span><h2>Pagos y penalizaciones</h2><p>La versión actual no solicita tarjeta ni cobra importes durante la reserva. No se aplicará una penalización por inasistencia salvo que el restaurante implante y comunique previamente una política específica y la persona la acepte antes de confirmar.</p></section>
        <section><span>07</span><h2>Ayuda</h2><p>Para asistencia puedes llamar al <a href={legalIdentity.phoneHref}>{legalIdentity.phoneDisplay}</a> o escribir a <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a>.</p></section>
        <p className="legal-updated">Última revisión: {legalIdentity.lastReview}</p>
      </article>
    </PublicPage>
  );
}
