import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function integer(value: unknown, min: number, max: number, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${label} fuera de rango.`);
  return parsed;
}

function time(value: unknown, label: string) {
  const parsed = String(value ?? '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(parsed)) throw new Error(`${label} no es una hora válida.`);
  return parsed;
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaffSession(['manager']);
    const body = await request.json();
    const entity = String(body.entity ?? '');
    const value = body.value ?? {};
    const id = String(value.id ?? '');
    if (!id) throw new Error('Elemento de configuración inválido.');
    const supabase = createAdminClient();
    let metadata: Record<string, unknown>;
    if (entity === 'service') {
      const patch = {
        active: Boolean(value.active), auto_confirm: Boolean(value.autoConfirm),
        default_duration_minutes: integer(value.defaultDurationMinutes, 30, 360, 'Duración'), updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('services').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
      metadata = patch;
    } else if (entity === 'rule') {
      const openTime = time(value.openTime, 'Apertura');
      const closeTime = time(value.closeTime, 'Cierre');
      if (openTime >= closeTime) throw new Error('La hora de cierre debe ser posterior a la apertura.');
      const minParty = integer(value.minPartySize, 1, 50, 'Grupo mínimo');
      const maxParty = integer(value.maxPartySize, 1, 50, 'Grupo máximo');
      if (minParty > maxParty) throw new Error('El grupo mínimo no puede superar al máximo.');
      const patch = {
        active: Boolean(value.active), open_time: openTime, close_time: closeTime,
        max_covers: value.maxCovers == null ? null : integer(value.maxCovers, 1, 500, 'Aforo'),
        min_notice_minutes: integer(value.minNoticeMinutes, 0, 10080, 'Antelación'),
        booking_horizon_days: integer(value.bookingHorizonDays, 1, 730, 'Horizonte'),
        min_party_size: minParty, max_party_size: maxParty,
      };
      const { error } = await supabase.from('availability_rules').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
      metadata = patch;
    } else {
      throw new Error('Tipo de configuración inválido.');
    }
    await supabase.from('activity_logs').insert({ actor_type: 'staff', actor_user_id: staff.id, action: 'operational_settings_updated', entity_type: entity, entity_id: id, metadata });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
