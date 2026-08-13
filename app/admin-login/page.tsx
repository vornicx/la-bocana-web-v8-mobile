import Link from 'next/link';
import type { Metadata } from 'next';
import { getStaffSession } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import { loginStaff } from './actions';
import './control-login.css';

export const metadata: Metadata = {
  title: 'La Bocana Control · Acceso',
  description: 'Acceso privado al sistema de operaciones de La Bocana.',
  robots: { index: false, follow: false, noarchive: true },
};

const messages: Record<string, string> = {
  missing: 'Introduce email y contraseña.',
  credentials: 'Las credenciales no son correctas.',
  session: 'No se pudo validar la sesión.',
  access: 'Esta cuenta no tiene acceso al equipo de La Bocana.',
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaffSession();
  if (staff) redirect('/control');
  const params = await searchParams;
  const message = params.error ? messages[params.error] : null;

  return (
    <main className="staff-login-page control-login-page" id="main-content">
      <section className="staff-login-visual control-login-visual">
        <div className="control-login-brand"><span>LB</span><div><strong>La Bocana</strong><small>Control</small></div></div>
        <div className="staff-login-copy control-login-copy">
          <span>Puerto Banús · operaciones privadas</span>
          <h1>Todo el servicio.<br />Un solo lugar.</h1>
          <p>Reservas, sala, clientes, carta y capacidad conectados para que el equipo pueda operar sin ruido.</p>
        </div>
        <div className="control-login-foot"><span><i />Sistema privado</span><small>Powered by Archic</small></div>
      </section>
      <section className="staff-login-panel control-login-panel">
        <form action={loginStaff} className="staff-login-form control-login-form">
          <div className="control-login-form-head"><span className="admin-kicker">Acceso de equipo</span><h2>Entrar a Control</h2><p>Utiliza tu cuenta autorizada de La Bocana.</p></div>
          {message && <div className="staff-login-error" role="alert">{message}</div>}
          <label><span>Email</span><input type="email" name="email" autoComplete="email" required autoFocus placeholder="nombre@labocana.es" /></label>
          <label><span>Contraseña</span><input type="password" name="password" autoComplete="current-password" required placeholder="••••••••" /></label>
          <button type="submit">Entrar a Control</button>
          <div className="control-login-security"><span>Acceso restringido</span><p>Solo las cuentas registradas del equipo pueden consultar información operativa y datos de clientes.</p></div>
          <Link href="/">Volver a La Bocana</Link>
        </form>
      </section>
    </main>
  );
}
