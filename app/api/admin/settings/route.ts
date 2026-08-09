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

function madridLocalToIso(value: unknown, label: string) {
  const local = String(value ?? '');
  const match = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)$/.exec(local);
  if (!match) throw new Error(`${label} no es una fecha y hora válida.`);
  const [, year, month, day, hour, minute] = match;
  const target = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const rendered = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    instant += target - rendered;
  }
  const verified = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  if (verified.year !== year || verified.month !== month || verified.day !== day || verified.hour !== hour || verified.minute !== minute) throw new Error(`${label} cae en un cambio horario no disponible. Elige otra hora.`);
  return new Date(instant).toISOString();
}

function closureReason(value: unknown) {
  const reason = String(value ?? '').trim();
  if (reason.length < 3 || reason.length > 180) throw new Error('El motivo debe tener entre 3 y 180 caracteres.');
  return reason;
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
    } else if (entity === 'closure') {
      const patch = { active: Boolean(value.active) };
      const { data, error } = await supabase.from('closures').update(patch).eq('id', id).is('area_id', null).is('table_id', null).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Cierre no encontrado o gestionado desde Sala.');
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


export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager']);
    const body = await request.json();
    const serviceId = body.serviceId ? String(body.serviceId) : null;
    const startsAt = madridLocalToIso(body.startsLocal, 'Inicio');
    const endsAt = madridLocalToIso(body.endsLocal, 'Fin');
    const reason = closureReason(body.reason);
    if (new Date(startsAt) >= new Date(endsAt)) throw new Error('El final debe ser posterior al inicio.');
    if (new Date(endsAt).getTime() - new Date(startsAt).getTime() > 1000 * 60 * 60 * 24 * 31) throw new Error('Un cierre no puede superar 31 días. Divide el periodo si hace falta.');
    const supabase = createAdminClient();
    if (serviceId) {
      const { data: service, error: serviceError } = await supabase.from('services').select('id').eq('id', serviceId).maybeSingle();
      if (serviceError) throw new Error(serviceError.message);
      if (!service) throw new Error('El servicio seleccionado no existe.');
    }
    const { data: overlaps, error: overlapError } = await supabase.from('closures').select('id, service_id').eq('active', true).is('area_id', null).is('table_id', null).lt('starts_at', endsAt).gt('ends_at', startsAt);
    if (overlapError) throw new Error(overlapError.message);
    const conflict = (overlaps ?? []).some((closure) => !closure.service_id || !serviceId || String(closure.service_id) === serviceId);
    if (conflict) throw new Error('Ya existe un cierre que se solapa con ese periodo y alcance.');
    const { data, error } = await supabase.from('closures').insert({ service_id: serviceId, starts_at: startsAt, ends_at: endsAt, reason, active: true }).select('id, service_id, starts_at, ends_at, reason, active').single();
    if (error) throw new Error(error.message);
    await supabase.from('activity_logs').insert({ actor_type: 'staff', actor_user_id: staff.id, action: 'operational_closure_created', entity_type: 'closure', entity_id: data.id, metadata: { service_id: serviceId, starts_at: startsAt, ends_at: endsAt, reason } });
    return NextResponse.json({ closure: data }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
