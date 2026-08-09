'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <main className="error-state" id="main-content">
      <span>La Bocana</span>
      <h1>Algo no ha salido como debía.</h1>
      <p>La incidencia puede ser temporal. Puedes intentarlo de nuevo sin perder el rumbo.</p>
      <div><button type="button" onClick={retry}>Reintentar</button><a href="/">Volver al inicio</a></div>
    </main>
  );
}
