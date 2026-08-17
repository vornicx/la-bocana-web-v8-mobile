'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import { ControlDemoVideo } from '@/components/admin/control-demo-video';
import { loginStaff, type LoginState } from './actions';

const DEMO_EMAIL = 'demo@labocana-control.es';
const DEMO_PASSWORD = 'LaBocanaDemo2026!';

export function LoginForm({ initialMessage = null }: { initialMessage?: string | null }) {
  const initialState: LoginState = { status: initialMessage ? 'error' : 'idle', message: initialMessage, email: '' };
  const [state, formAction, pending] = useActionState(loginStaff, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function useDemoAccess() {
    if (emailRef.current) emailRef.current.value = DEMO_EMAIL;
    if (passwordRef.current) passwordRef.current.value = DEMO_PASSWORD;
    emailRef.current?.focus();
  }

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

      <div className="control-demo-access" aria-label="Credenciales de demostración">
        <div className="control-demo-access-head">
          <div>
            <span>Acceso de demostración</span>
            <strong>Explora Control en modo solo lectura</strong>
          </div>
          <span className="control-demo-badge">Demo</span>
        </div>
        <div className="control-demo-credentials">
          <div><span>Email</span><code>{DEMO_EMAIL}</code></div>
          <div><span>Contraseña</span><code>{DEMO_PASSWORD}</code></div>
        </div>
        <button className="control-demo-use" type="button" onClick={useDemoAccess} disabled={pending}>
          Usar acceso demo
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <ControlDemoVideo variant="card" />

      <label>
        <span>Email</span>
        <input ref={emailRef} type="email" name="email" autoComplete="email" required autoFocus defaultValue={state.email} placeholder="nombre@labocana.es" disabled={pending} />
      </label>

      <label>
        <span>Contraseña</span>
        <div className="control-password-field">
          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" required placeholder="Tu contraseña" disabled={pending} />
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
        <p>La cuenta demo permite consultar la experiencia sin modificar reservas, clientes, carta ni configuración.</p>
      </div>

      <Link href="/">← Volver a La Bocana</Link>
    </form>
  );
}
