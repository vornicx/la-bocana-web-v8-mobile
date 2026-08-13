import Image from 'next/image';
import type { Metadata } from 'next';
import { getStaffSession } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';
import './control-login.css';
import './control-login-brand.css';

export const metadata: Metadata = {
  title: 'La Bocana Control · Acceso',
  description: 'Acceso privado al sistema de operaciones de La Bocana.',
  robots: { index: false, follow: false, noarchive: true },
};

const messages: Record<string, string> = {
  missing: 'Introduce tu email y contraseña para continuar.',
  credentials: 'Email o contraseña incorrectos. Comprueba los datos e inténtalo de nuevo.',
  session: 'No se ha podido validar la sesión. Inténtalo de nuevo.',
  access: 'Esta cuenta no tiene acceso activo a La Bocana Control.',
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaffSession();
  if (staff) redirect('/control');
  const params = await searchParams;
  const initialMessage = params.error ? messages[params.error] : null;

  return (
    <main className="staff-login-page control-login-page" id="main-content">
      <section className="staff-login-visual control-login-visual" aria-label="La Bocana Control">
        <Image
          className="control-login-image"
          src="/images/gallery-official/mesa-atardecer.webp"
          alt="Mesa de La Bocana frente al Mediterráneo"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 56vw"
        />
        <div className="control-login-overlay" />

        <div className="control-login-brand">
          <span>LB</span>
          <div><strong>La Bocana</strong><small>Control</small></div>
        </div>

        <div className="staff-login-copy control-login-copy">
          <span>Puerto Banús · sistema privado</span>
          <h1>El servicio,<br />bajo control.</h1>
          <p>Una interfaz hecha para decidir rápido: quién llega, dónde se sienta, qué necesita y qué requiere atención ahora.</p>
          <div className="control-login-capabilities" aria-label="Funciones principales">
            <span>Reservas en vivo</span>
            <span>Sala conectada</span>
            <span>Memoria de clientes</span>
          </div>
        </div>

        <div className="control-login-foot">
          <span><i />Sistema operativo</span>
          <small>La Bocana × Archic</small>
        </div>
      </section>

      <section className="staff-login-panel control-login-panel">
        <div className="control-login-panel-inner">
          <div className="control-login-panel-brand"><span>LB</span><div><strong>La Bocana</strong><small>Control</small></div></div>
          <LoginForm initialMessage={initialMessage} />
          <div className="control-login-panel-foot"><span>Puerto Banús</span><span>Acceso privado</span></div>
        </div>
      </section>
    </main>
  );
}
