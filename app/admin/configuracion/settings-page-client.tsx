'use client';

import { useState } from 'react';
import type { AvailabilityRule, OperationalService, OperationalSettings } from '@/lib/admin/types';

const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function SettingsPageClient({ initialSettings, canEdit }: { initialSettings: OperationalSettings; canEdit: boolean }) {
  const [settings, setSettings] = useState(initialSettings);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateServiceLocal(serviceId: string, patch: Partial<OperationalService>) {
    setSettings((current) => ({ ...current, services: current.services.map((service) => service.id === serviceId ? { ...service, ...patch } : service) }));
  }

  function updateRuleLocal(serviceId: string, ruleId: string, patch: Partial<AvailabilityRule>) {
    setSettings((current) => ({ ...current, services: current.services.map((service) => service.id === serviceId ? { ...service, rules: service.rules.map((rule) => rule.id === ruleId ? { ...rule, ...patch } : rule) } : service) }));
  }

  async function save(entity: 'service' | 'rule', value: OperationalService | AvailabilityRule) {
    setBusy(value.id);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity, value }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'No se pudo guardar la configuración.');
      setMessage('Configuración guardada y registrada en el historial de actividad.');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return <div className="admin-page operational-settings-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Motor de disponibilidad · configuración real</span><h1>La operación decide. El código no.</h1><p>Horarios, duración, aforo y condiciones de reserva alimentan el calendario público y Control desde una única fuente.</p></div>{!canEdit && <span className="pending-tag">Solo lectura</span>}</div>
    <div className="settings-health"><div><span>Servicios</span><strong>{settings.services.length}</strong></div><div><span>Mesas</span><strong>{settings.counts.tables}</strong><small>{settings.counts.areas} áreas · {settings.counts.combinations} combinaciones</small></div><div><span>Cierres activos</span><strong>{settings.counts.closures}</strong></div><div><span>Equipo</span><strong>{settings.counts.users}</strong></div></div>
    {message && <div className="admin-feedback" role="status">{message}</div>}
    <div className="service-settings-list">{settings.services.map((service) => <section className="admin-panel service-settings" key={service.id}><div className="service-settings-head"><div><span className="admin-kicker">Servicio</span><h2>{service.name}</h2><p>{service.rules.filter((rule) => rule.active).length} días configurados · datos que utiliza Bookings para ofrecer disponibilidad.</p></div><div className="service-master-fields"><label><span>Duración</span><select disabled={!canEdit} value={service.defaultDurationMinutes} onChange={(event) => updateServiceLocal(service.id, { defaultDurationMinutes: Number(event.target.value) })}><option value={75}>75 min</option><option value={90}>90 min</option><option value={105}>105 min</option><option value={120}>120 min</option><option value={135}>135 min</option><option value={150}>150 min</option></select></label><label className="toggle-label"><input type="checkbox" disabled={!canEdit} checked={service.autoConfirm} onChange={(event) => updateServiceLocal(service.id, { autoConfirm: event.target.checked })}/><span>Confirmación automática</span></label><label className="toggle-label"><input type="checkbox" disabled={!canEdit} checked={service.active} onChange={(event) => updateServiceLocal(service.id, { active: event.target.checked })}/><span>Servicio activo</span></label><button className="admin-primary" disabled={!canEdit || busy === service.id} onClick={() => save('service', service)}>Guardar servicio</button></div></div>
        <div className="rules-table-wrap"><table className="rules-table"><thead><tr><th>Día</th><th>Estado</th><th>Apertura</th><th>Cierre</th><th>Aforo</th><th>Antelación</th><th>Horizonte</th><th>Grupo</th><th></th></tr></thead><tbody>{service.rules.map((rule) => <tr key={rule.id} className={!rule.active ? 'inactive' : ''}><td><strong>{days[rule.dayOfWeek]}</strong></td><td><label className="switch"><input type="checkbox" disabled={!canEdit} checked={rule.active} onChange={(event) => updateRuleLocal(service.id, rule.id, { active: event.target.checked })}/><span/></label></td><td><input type="time" disabled={!canEdit} value={rule.openTime} onChange={(event) => updateRuleLocal(service.id, rule.id, { openTime: event.target.value })}/></td><td><input type="time" disabled={!canEdit} value={rule.closeTime} onChange={(event) => updateRuleLocal(service.id, rule.id, { closeTime: event.target.value })}/></td><td><input type="number" min="1" max="500" disabled={!canEdit} value={rule.maxCovers ?? ''} onChange={(event) => updateRuleLocal(service.id, rule.id, { maxCovers: event.target.value ? Number(event.target.value) : null })}/></td><td><input type="number" min="0" max="10080" disabled={!canEdit} value={rule.minNoticeMinutes} onChange={(event) => updateRuleLocal(service.id, rule.id, { minNoticeMinutes: Number(event.target.value) })}/><small>min</small></td><td><input type="number" min="1" max="730" disabled={!canEdit} value={rule.bookingHorizonDays} onChange={(event) => updateRuleLocal(service.id, rule.id, { bookingHorizonDays: Number(event.target.value) })}/><small>días</small></td><td><div className="party-range"><input type="number" min="1" max="50" disabled={!canEdit} value={rule.minPartySize} onChange={(event) => updateRuleLocal(service.id, rule.id, { minPartySize: Number(event.target.value) })}/><span>–</span><input type="number" min="1" max="50" disabled={!canEdit} value={rule.maxPartySize} onChange={(event) => updateRuleLocal(service.id, rule.id, { maxPartySize: Number(event.target.value) })}/></div></td><td><button className="admin-secondary" disabled={!canEdit || busy === rule.id} onClick={() => save('rule', rule)}>Guardar</button></td></tr>)}</tbody></table></div>
      </section>)}</div>
    <div className="settings-notes"><section><span className="admin-kicker">Plano</span><h2>{settings.counts.tables} mesas conectadas</h2><p>Las capacidades, combinaciones y posiciones se gestionan en Sala. La validación del plano físico sigue siendo un hito con el restaurante.</p></section><section><span className="admin-kicker">Cierres y excepciones</span><h2>{settings.counts.closures ? `${settings.counts.closures} bloqueos activos` : 'Sin cierres extraordinarios'}</h2><p>Los bloqueos de mesa y servicio existentes ya afectan a disponibilidad. La edición de cierres generales se incorporará aquí sin modificar código.</p></section><section><span className="admin-kicker">Comunicaciones</span><h2>Integración pendiente</h2><p>El sistema todavía no envía emails o WhatsApp automáticamente. Se conectará un proveedor transaccional con dominio verificado y trazabilidad.</p></section></div>
  </div>;
}
