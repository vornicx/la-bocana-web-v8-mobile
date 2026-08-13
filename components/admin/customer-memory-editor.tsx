'use client';

import { useState } from 'react';
import { CheckIcon } from './admin-icons';

export function CustomerMemoryEditor({ customerId, initialAllergies, initialPreferences, initialNotes, canEdit }: {
  customerId: string;
  initialAllergies: string | null;
  initialPreferences: string | null;
  initialNotes: string | null;
  canEdit: boolean;
}) {
  const [allergies, setAllergies] = useState(initialAllergies ?? '');
  const [preferences, setPreferences] = useState(initialPreferences ?? '');
  const [internalNotes, setInternalNotes] = useState(initialNotes ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true); setMessage(null); setSaved(false);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ allergies, preferences, internalNotes }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo guardar la memoria del cliente.');
      setSaved(true);
      setMessage('Memoria del cliente actualizada.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally { setBusy(false); }
  }

  return <section className="admin-panel customer-memory-editor">
    <div className="customer-memory-head"><div><span className="admin-kicker">Memoria de servicio</span><h2>Lo que el equipo debe recordar</h2><p>Información operativa compartida entre reservas para recibir al cliente con contexto, sin depender de notas sueltas.</p></div>{saved && <span className="customer-memory-saved"><CheckIcon />Guardado</span>}</div>
    <label className={allergies.trim() ? 'memory-alert' : ''}><span>Alergias y restricciones</span><textarea value={allergies} disabled={!canEdit || busy} maxLength={1000} onChange={(event) => setAllergies(event.target.value)} placeholder="Alergias, intolerancias o restricciones relevantes…"/></label>
    <label><span>Preferencias</span><textarea value={preferences} disabled={!canEdit || busy} maxLength={1000} onChange={(event) => setPreferences(event.target.value)} placeholder="Mesa preferida, zona, ritmo del servicio, celebraciones…"/></label>
    <label><span>Notas internas</span><textarea value={internalNotes} disabled={!canEdit || busy} maxLength={2000} onChange={(event) => setInternalNotes(event.target.value)} placeholder="Contexto útil únicamente para el equipo…"/></label>
    <div className="customer-memory-actions"><small>{canEdit ? 'Visible solo para el equipo autorizado.' : 'Tu rol tiene acceso de solo lectura.'}</small>{message && <span role="status">{message}</span>}<button className="admin-primary" type="button" disabled={!canEdit || busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar memoria'}</button></div>
  </section>;
}
