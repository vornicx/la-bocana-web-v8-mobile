'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ControlError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('La Bocana Control view error', error);
  }, [error]);

  return (
    <div className="admin-page control-error-page">
      <section className="admin-panel control-error-card" role="alert">
        <span className="admin-kicker">Control · conexión de datos</span>
        <h1>No se ha podido cargar esta vista.</h1>
        <p>La interfaz sigue disponible. Reintenta la consulta o vuelve al resumen para continuar trabajando.</p>
        <div className="control-error-actions">
          <button className="admin-primary" type="button" onClick={reset}>Reintentar ahora</button>
          <Link className="admin-secondary" href="/control">Volver al resumen</Link>
        </div>
        <small>Si el problema persiste, Control conservará las operaciones ya confirmadas en la base de datos.</small>
      </section>
    </div>
  );
}
