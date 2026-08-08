import type { Metadata } from 'next';
import { PublicPage } from '@/components/public-page';

export const metadata: Metadata = {
  title: 'Privacidad',
  description: 'Información sobre el tratamiento de datos personales en las reservas de La Bocana.',
};

export default function PrivacyPage() {
  return (
    <PublicPage eyebrow="Información legal" title="Privacidad, con claridad." intro="Cómo utilizamos los datos necesarios para gestionar una reserva y atenderte antes, durante y después de tu visita." image="/images/photo-6.jpg">
      <article className="legal-copy">
        <aside className="legal-review"><strong>Revisión previa a publicación</strong><span>El titular debe completar razón social, NIF y un correo para el ejercicio de derechos. La página está deliberadamente bloqueada como texto definitivo hasta validar esos tres datos.</span></aside>
        <section><span>01</span><h2>Responsable</h2><p>El responsable será el titular legal del restaurante La Bocana, con establecimiento en Complejo Benabola, Bloque 1, Puerto Banús, Marbella. La identificación fiscal y el correo de privacidad deben incorporarse tras su validación por el negocio.</p></section>
        <section><span>02</span><h2>Qué datos y para qué</h2><p>Tratamos nombre, apellidos, teléfono, correo electrónico y los datos de la reserva para gestionarla, contactar contigo por cuestiones operativas y prestar el servicio solicitado. Las preferencias y notas son opcionales. Las alergias o intolerancias se facilitan voluntariamente para adaptar la atención y proteger tu seguridad.</p></section>
        <section><span>03</span><h2>Base jurídica</h2><p>La gestión de la reserva se basa en la aplicación de medidas precontractuales y, cuando corresponda, en la prestación del servicio. Si comunicas datos de salud —como alergias o intolerancias— su tratamiento se basa en tu consentimiento explícito, que puedes retirar sin afectar a la licitud del tratamiento anterior.</p></section>
        <section><span>04</span><h2>Conservación y destinatarios</h2><p>Los datos se conservarán durante el tiempo necesario para gestionar la reserva, atender posibles responsabilidades y cumplir los plazos legales aplicables. Solo podrán acceder el equipo autorizado y los proveedores tecnológicos que actúen por cuenta del restaurante con las garantías contractuales correspondientes. No se venden datos personales.</p></section>
        <section><span>05</span><h2>Tus derechos</h2><p>Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad, y retirar un consentimiento. Hasta validar el correo específico, puedes dirigirte al restaurante en la dirección indicada o llamar al <a href="tel:+34952781410">+34 952 781 410</a>. También puedes reclamar ante la Agencia Española de Protección de Datos.</p></section>
      </article>
    </PublicPage>
  );
}
