'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#f4f0e6', color: '#173127', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <title>Incidencia temporal | La Bocana</title>
        <main style={{ minHeight: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>La Bocana</span>
          <h1 style={{ maxWidth: 760, margin: '20px 0', fontFamily: 'Georgia, Times New Roman, serif', fontSize: 'clamp(44px, 8vw, 84px)', lineHeight: 0.95, fontWeight: 400, letterSpacing: '-0.05em' }}>Estamos recuperando el servicio.</h1>
          <p style={{ maxWidth: 520, margin: '0 0 30px', color: '#516057', lineHeight: 1.65 }}>Se ha producido una incidencia temporal. Vuelve a intentarlo en unos segundos.</p>
          <button type="button" onClick={retry} style={{ minHeight: 50, padding: '0 24px', border: 0, background: '#173127', color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>Reintentar</button>
        </main>
      </body>
    </html>
  );
}
