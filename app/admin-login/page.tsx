import Link from 'next/link';
import { getStaffSession } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import { loginStaff } from './actions';

const messages: Record<string, string> = {
  missing: 'Introduce email y contraseña.',
  credentials: 'Las credenciales no son correctas.',
  session: 'No se pudo validar la sesión.',
  access: 'Esta cuenta no tiene acceso al equipo de La Bocana.',
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const staff = await getStaffSession();
  if (staff) redirect('/admin/sala');
  const params = await searchParams;
  const message = params.error ? messages[params.error] : null;

  return (
    <main className="staff-login-page">
      <section className="staff-login-visual">
        <div className="staff-login-brand"><span>LB</span><strong>LA BOCANA</strong></div>
        <div className="staff-login-copy">
          <span>Puerto Banús · desde 1987</span>
          <h1>La sala,<br />en orden.</h1>
          <p>Reservas, mesas y servicio en una única vista privada para el equipo.</p>
        </div>
        <small>Archic · sistema de operaciones</small>
      </section>
      <section className="staff-login-panel">
        <form action={loginStaff} className="staff-login-form">
          <div><span className="admin-kicker">Acceso de equipo</span><h2>Entrar a operaciones</h2><p>Utiliza tu cuenta autorizada de La Bocana.</p></div>
          {message && <div className="staff-login-error">{message}</div>}
          <label><span>Email</span><input type="email" name="email" autoComplete="email" required placeholder="nombre@labocana.es" /></label>
          <label><span>Contraseña</span><input type="password" name="password" autoComplete="current-password" required placeholder="••••••••" /></label>
          <button type="submit">Entrar al sistema</button>
          <p className="staff-login-help">El acceso está limitado a cuentas registradas en el equipo. Las reservas de clientes no son visibles sin autenticación.</p>
          <Link href="/">← Volver a La Bocana</Link>
        </form>
      </section>
    </main>
  );
}
