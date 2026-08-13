'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { loginStaff, type LoginState } from './actions';

export function LoginForm({ initialMessage = null }: { initialMessage?: string | null }) {
  const initialState: LoginState = { status: initialMessage ? 'error' : 'idle', message: initialMessage, email: '' };
  const [state, formAction, pending] = useActionState(loginStaff, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className={`staff-login-form control-login-form ${pending ? 'is-pending' : ''}`} aria-busy={pending}>
      <div className="control-login-form-head">
        <span className="admin-kicker">Acceso de equipo</span>
        <h2>Entrar a Control</h2>
        <p>Tu espacio de operaciones, preparado para el servicio.</p>
      </div>

      <div className={`control-login-status ${state.status === 'error' ? 'error' : pending ? 'pending' : 'ready'}`} aria-live="polite">
        <span className="control-login-status-icon" aria-hidden="true">{pending ? <i className="control-login-spinner" /> : <i />}</span>
        <div>
          <strong>{pending ? 'Comprobando acceso…' : state.status === 'error' ? 'No se ha podido iniciar sesión' : 'Acceso seguro'}</strong>
          <small>{pending ? 'Validando tus credenciales y permisos de equipo.' : state.message ?? 'Solo personal autorizado de La Bocana.'}</small>
        </div>
      </div>

      <label>
        <span>Email</span>
        <input type="email" name="email" autoComplete="email" required autoFocus defaultValue={state.email} placeholder="nombre@labocana.es" disabled={pending} />
      </label>

      <label>
        <span>Contraseña</span>
        <div className="control-password-field">
          <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required placeholder="Tu contraseña" disabled={pending} />
          <button type="button" onClick={() => setShowPassword((value) => !value)} disabled={pending} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </label>

      <button className="control-login-submit" type="submit" disabled={pending}>
        <span>{pending ? 'Iniciando sesión' : 'Entrar a Control'}</span>
        {pending ? <i className="control-login-button-spinner" aria-hidden="true" /> : <span className="control-login-arrow" aria-hidden="true">→</span>}
      </button>

      <div className="control-login-security">
        <span>Protección de datos operativos</span>
        <p>Reservas, clientes y actividad permanecen restringidos a las cuentas autorizadas del equipo.</p>
      </div>

      <Link href="/">← Volver a La Bocana</Link>
    </form>
  );
}
