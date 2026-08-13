'use client';

import { useMemo, useState } from 'react';
import { ControlSelect, ControlToggle, DateTimePicker, NumberStepper, TimePicker } from '@/components/admin/control-fields';
import type { AvailabilityRule, OperationalClosure, OperationalService, OperationalSettings } from '@/lib/admin/types';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const durationOptions = [75, 90, 105, 120, 135, 150].map((value) => ({ value: String(value), label: `${value} min`, description: value <= 90 ? 'Servicio ágil' : value >= 135 ? 'Servicio pausado' : 'Duración estándar' }));

export function SettingsPageClient({ initialSettings, canEdit }: { initialSettings: OperationalSettings; canEdit: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [closureDraft, setClosureDraft] = useState({ serviceId: '', startsLocal: '', endsLocal: '', reason: '' });

  const serviceOptions = useMemo(() => [
    { value: '', label: 'Todo el restaurante', description: 'Bloquea todos los servicios' },
    ...settings.services.map((service) => ({ value: service.id, label: service.name, description: 'Solo este servicio' })),
  ], [settings.services]);

  function updateServiceLocal(serviceId: string, patch: Partial<OperationalService>) {
    setSettings((current) => ({ ...current, services: current.services.map((service) => service.id === serviceId ? { ...service, ...patch } : service) }));
  }

  function updateRuleLocal(serviceId: string, ruleId: string, patch: Partial<AvailabilityRule>) {
    setSettings((current) => ({ ...current, services: current.services.map((service) => service.id === serviceId ? { ...service, rules: service.rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule) } : service) }));
  }

  async function save(entity: 'service' | 'rule' | 'closure', value: OperationalService | AvailabilityRule | OperationalClosure) {
    setBusy(value.id);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity, value }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo guardar la configuración.');
      setMessage('Cambios guardados. Bookings y Control ya utilizan esta configuración.');
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function createClosure() {
    setBusy('new-closure');
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(closureDraft) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo crear el cierre.');
      const service = settings.services.find((entry) => entry.id === payload.closure.service_id);
      const closure: OperationalClosure = {
        id: payload.closure.id,
        serviceId: payload.closure.service_id,
        serviceName: service?.name ?? (payload.closure.service_id ? 'Servicio' : 'Todo el restaurante'),
        startsAt: payload.closure.starts_at,
        endsAt: payload.closure.ends_at,
        reason: payload.closure.reason,
        active: true,
      };
      setSettings((current) => ({ ...current, closures: [...current.closures, closure].sort((a, b) => a.startsAt.localeCompare(b.startsAt)), counts: { ...current.counts, closures: current.counts.closures + 1 } }));
      setClosureDraft({ serviceId: '', startsLocal: '', endsLocal: '', reason: '' });
      setMessage('Cierre creado. Ya afecta a disponibilidad, calendario y Sala.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deactivateClosure(closure: OperationalClosure) {
    const saved = await save('closure', { ...closure, active: false });
    if (saved) setSettings((current) => ({ ...current, closures: current.closures.filter((entry) => entry.id !== closure.id), counts: { ...current.counts, closures: Math.max(0, current.counts.closures - 1) } }));
  }

  const dateTime = (value: string) => new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  return <div className="admin-page operational-settings-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Motor de disponibilidad · configuración real</span><h1>La operación decide. El código no.</h1><p>Horarios, duración, aforo y condiciones de reserva alimentan el calendario público y Control desde una única fuente.</p></div>{!canEdit && <span className="pending-tag">Solo lectura</span>}</div>

    <div className="settings-health"><div><span>Servicios</span><strong>{settings.services.length}</strong></div><div><span>Mesas</span><strong>{settings.counts.tables}</strong><small>{settings.counts.areas} áreas · {settings.counts.combinations} combinaciones</small></div><div><span>Cierres activos</span><strong>{settings.counts.closures}</strong></div><div><span>Equipo</span><strong>{settings.counts.users}</strong></div></div>
    {message && <div className="admin-feedback" role="status">{message}</div>}

    <div className="service-settings-list">{settings.services.map((service) => <section className="admin-panel service-settings premium-service-settings" key={service.id}>
      <div className="service-settings-head premium-service-head">
        <div><span className="admin-kicker">Servicio</span><h2>{service.name}</h2><p>{service.rules.filter((rule) => rule.active).length} días configurados · disponibilidad pública conectada.</p></div>
        <div className="service-master-fields premium-service-master">
          <label><span>Duración</span><ControlSelect disabled={!canEdit} value={String(service.defaultDurationMinutes)} options={durationOptions} onChange={(value) => updateServiceLocal(service.id, { defaultDurationMinutes: Number(value) })} ariaLabel={`Duración de ${service.name}`} /></label>
          <ControlToggle disabled={!canEdit} checked={service.autoConfirm} onChange={(checked) => updateServiceLocal(service.id, { autoConfirm: checked })} label="Confirmación automática" description="Confirma si hay capacidad real" />
          <ControlToggle disabled={!canEdit} checked={service.active} onChange={(checked) => updateServiceLocal(service.id, { active: checked })} label="Servicio activo" description="Visible en Bookings" />
          <button className="admin-primary service-save" disabled={!canEdit || busy === service.id} onClick={() => save('service', service)}>{busy === service.id ? 'Guardando…' : 'Guardar servicio'}</button>
        </div>
      </div>

      <div className="rules-table-wrap premium-rules-wrap"><table className="rules-table premium-rules-table">
        <thead><tr><th>Día</th><th>Estado</th><th>Apertura</th><th>Cierre</th><th>Aforo</th><th>Antelación</th><th>Horizonte</th><th>Grupo</th><th></th></tr></thead>
        <tbody>{service.rules.map((rule) => <tr key={rule.id} className={!rule.active ? 'inactive' : ''}>
          <td><strong>{days[rule.dayOfWeek]}</strong><small>{rule.active ? 'Aceptando reservas' : 'No disponible'}</small></td>
          <td><ControlToggle disabled={!canEdit} checked={rule.active} onChange={(checked) => updateRuleLocal(service.id, rule.id, { active: checked })} label={rule.active ? 'Abierto' : 'Cerrado'} /></td>
          <td><TimePicker disabled={!canEdit || !rule.active} value={rule.openTime} min="08:00" max="23:45" onChange={(value) => updateRuleLocal(service.id, rule.id, { openTime: value })} ariaLabel={`Apertura ${days[rule.dayOfWeek]}`} /></td>
          <td><TimePicker disabled={!canEdit || !rule.active} value={rule.closeTime} min="09:00" max="23:45" onChange={(value) => updateRuleLocal(service.id, rule.id, { closeTime: value })} ariaLabel={`Cierre ${days[rule.dayOfWeek]}`} /></td>
          <td><NumberStepper compact disabled={!canEdit || !rule.active} value={rule.maxCovers ?? 0} min={0} max={500} step={5} suffix="pax" onChange={(value) => updateRuleLocal(service.id, rule.id, { maxCovers: value === 0 ? null : value })} ariaLabel="Aforo máximo" /></td>
          <td><NumberStepper compact disabled={!canEdit || !rule.active} value={rule.minNoticeMinutes} min={0} max={10080} step={15} suffix="min" onChange={(value) => updateRuleLocal(service.id, rule.id, { minNoticeMinutes: value })} ariaLabel="Antelación mínima" /></td>
          <td><NumberStepper compact disabled={!canEdit || !rule.active} value={rule.bookingHorizonDays} min={1} max={730} step={1} suffix="días" onChange={(value) => updateRuleLocal(service.id, rule.id, { bookingHorizonDays: value })} ariaLabel="Horizonte de reserva" /></td>
          <td><div className="party-range premium-party-range"><NumberStepper compact disabled={!canEdit || !rule.active} value={rule.minPartySize} min={1} max={50} onChange={(value) => updateRuleLocal(service.id, rule.id, { minPartySize: Math.min(value, rule.maxPartySize) })} ariaLabel="Grupo mínimo" /><span>—</span><NumberStepper compact disabled={!canEdit || !rule.active} value={rule.maxPartySize} min={1} max={50} onChange={(value) => updateRuleLocal(service.id, rule.id, { maxPartySize: Math.max(value, rule.minPartySize) })} ariaLabel="Grupo máximo" /></div></td>
          <td><button className="admin-secondary rule-save" disabled={!canEdit || busy === rule.id} onClick={() => save('rule', rule)}>{busy === rule.id ? 'Guardando…' : 'Guardar'}</button></td>
        </tr>)}</tbody>
      </table></div>
    </section>)}</div>

    <section className="admin-panel closure-settings">
      <div className="closure-settings-head"><div><span className="admin-kicker">Cierres y excepciones</span><h2>Bloqueos que Bookings entiende.</h2><p>Cierra todo el restaurante o solo un servicio. El cambio se refleja en disponibilidad, calendario y Sala sin tocar código.</p></div><span className="count-badge">{settings.closures.length}</span></div>
      <div className="closure-create bespoke-closure-create">
        <label><span>Alcance</span><ControlSelect disabled={!canEdit} value={closureDraft.serviceId} options={serviceOptions} onChange={(value) => setClosureDraft((current) => ({ ...current, serviceId: value }))} ariaLabel="Alcance del cierre" /></label>
        <label><span>Desde</span><DateTimePicker disabled={!canEdit} value={closureDraft.startsLocal} onChange={(value) => setClosureDraft((current) => ({ ...current, startsLocal: value }))} ariaLabel="Inicio del cierre" /></label>
        <label><span>Hasta</span><DateTimePicker disabled={!canEdit} value={closureDraft.endsLocal} onChange={(value) => setClosureDraft((current) => ({ ...current, endsLocal: value }))} ariaLabel="Fin del cierre" /></label>
        <label className="closure-reason"><span>Motivo interno</span><input type="text" maxLength={180} disabled={!canEdit} placeholder="Festivo, evento privado, mantenimiento…" value={closureDraft.reason} onChange={(event) => setClosureDraft((current) => ({ ...current, reason: event.target.value }))}/></label>
        <button className="admin-primary" disabled={!canEdit || busy === 'new-closure' || !closureDraft.startsLocal || !closureDraft.endsLocal || closureDraft.reason.trim().length < 3} onClick={createClosure}>{busy === 'new-closure' ? 'Creando…' : 'Crear cierre'}</button>
      </div>
      <div className="closure-list">{settings.closures.length ? settings.closures.map((closure) => <article key={closure.id}><div><span>{closure.serviceName}</span><strong>{dateTime(closure.startsAt)} — {dateTime(closure.endsAt)}</strong><small>{closure.reason || 'Sin motivo'}</small></div><button className="admin-secondary" disabled={!canEdit || busy === closure.id} onClick={() => deactivateClosure(closure)}>{busy === closure.id ? 'Retirando…' : 'Retirar cierre'}</button></article>) : <div className="closure-empty"><strong>Sin cierres extraordinarios</strong><span>Los horarios semanales siguen funcionando con normalidad.</span></div>}</div>
    </section>

    <div className="settings-notes"><section><span className="admin-kicker">Plano</span><h2>{settings.counts.tables} mesas conectadas</h2><p>Las capacidades, combinaciones y posiciones se gestionan en Sala. La validación del plano físico sigue siendo un hito con el restaurante.</p></section><section><span className="admin-kicker">Trazabilidad</span><h2>Cada cambio queda registrado</h2><p>Altas, modificaciones y retirada de cierres se vinculan al usuario del equipo que realizó la acción.</p></section><section><span className="admin-kicker">Comunicaciones</span><h2>Integración pendiente</h2><p>El sistema todavía no envía emails o WhatsApp automáticamente. Se conectará un proveedor transaccional con dominio verificado y trazabilidad.</p></section></div>
  </div>;
}
