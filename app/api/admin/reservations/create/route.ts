import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createHold, releaseHold } from '@/lib/reservations/service';
import { hashToken } from '@/lib/security/request';
import { createAdminClient } from '@/lib/supabase/admin';

const sources = new Set(['phone', 'admin', 'instagram', 'google', 'other']);

function requiredString(value: unknown, label: string, max: number) {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(`${label} es obligatorio.`);
  if (result.length > max) throw new Error(`${label} es demasiado largo.`);
  return result;
}

function optionalString(value: unknown, max: number) {
  const result = String(value ?? '').trim();
  if (result.length > max) throw new Error('Uno de los campos es demasiado largo.');
  return result;
}

export async function POST(request: Request) {
  let holdId: string | null = null;
  let sessionId: string | null = null;
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const date = requiredString(body.date, 'La fecha', 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Fecha inválida.');
    const serviceId = requiredString(body.serviceId, 'El servicio', 64);
    const startsAt = requiredString(body.startsAt, 'La hora', 80);
    const adults = Number(body.adults);
    const children = Number(body.children ?? 0);
    if (!Number.isInteger(adults) || adults < 1 || adults > 30) throw new Error('Número de adultos inválido.');
    if (!Number.isInteger(children) || children < 0 || children > 20) throw new Error('Número de niños inválido.');
    const firstName = requiredString(body.firstName, 'El nombre', 80);
    const lastName = requiredString(body.lastName, 'Los apellidos', 120);
    const phone = requiredString(body.phone, 'El teléfono', 60);
    const email = optionalString(body.email, 240);
    const source = String(body.source ?? 'phone');
    if (!sources.has(source)) throw new Error('Origen de reserva inválido.');
    const allergies = optionalString(body.allergies, 1000);
    const preferences = optionalString(body.preferences, 1000);
    const notes = optionalString(body.notes, 1500);
    const internalNotes = optionalString(body.internalNotes, 2000);
    const waitlistId = optionalString(body.waitlistId, 80);
    const supabase = createAdminClient();

    if (waitlistId) {
      const { data: waitlist, error: waitlistError } = await supabase.from('waitlist')
        .select('id, status, desired_date, party_size, converted_reservation_id, offer_expires_at')
        .eq('id', waitlistId).maybeSingle();
      if (waitlistError) throw new Error(waitlistError.message);
      if (!waitlist) throw new Error('La solicitud de lista de espera ya no existe.');
      if (waitlist.status !== 'offered') throw new Error('El hueco debe estar marcado como ofrecido antes de convertirlo.');
      if (waitlist.converted_reservation_id) throw new Error('Esta solicitud ya está vinculada a una reserva.');
      if (waitlist.offer_expires_at && new Date(waitlist.offer_expires_at).getTime() <= Date.now()) {
        throw new Error('La oferta ha caducado. Retírala y vuelve a ofrecer un hueco antes de convertirla.');
      }
      if (String(waitlist.desired_date) !== date) throw new Error('La fecha no coincide con la solicitud de espera.');
      if (Number(waitlist.party_size) !== adults + children) throw new Error('El número de comensales no coincide con la solicitud de espera.');
    }

    sessionId = `admin:${staff.id}:${randomBytes(10).toString('hex')}`;
    const hold = await createHold({ date, serviceId, startsAt, adults, children, sessionId });
    holdId = hold.holdId;

    const managementToken = randomBytes(32).toString('base64url');
    const confirmationCode = `LB-${randomBytes(6).toString('hex').toUpperCase()}`;
    const { data, error } = await supabase.rpc('confirm_reservation_from_hold_atomic', {
      p_hold_id: hold.holdId,
      p_first_name: firstName,
      p_last_name: lastName,
      p_email: email || null,
      p_phone: phone,
      p_allergies: allergies || null,
      p_preferences: preferences || null,
      p_notes: notes || null,
      p_management_token_hash: hashToken(managementToken),
      p_confirmation_code: confirmationCode,
      p_source: source,
    });
    if (error) throw new Error(`No se pudo crear la reserva: ${error.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.reservation_id) throw new Error('No se pudo crear la reserva.');
    const reservationId = String(row.reservation_id);
    holdId = null;

    const update = await supabase.from('reservations').update({
      created_by: staff.id,
      internal_notes: internalNotes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', reservationId);

    let waitlistWarning: string | null = null;
    if (waitlistId) {
      const { data: converted, error: conversionError } = await supabase.from('waitlist').update({
        status: 'converted',
        converted_reservation_id: reservationId,
      }).eq('id', waitlistId).eq('status', 'offered').is('converted_reservation_id', null).select('id').maybeSingle();
      if (conversionError || !converted) waitlistWarning = 'La reserva se creó, pero la solicitud de espera no pudo cerrarse automáticamente.';
      else await supabase.from('activity_logs').insert({
        actor_type: 'staff', actor_user_id: staff.id, action: 'waitlist_converted', entity_type: 'waitlist', entity_id: waitlistId,
        metadata: { reservation_id: reservationId },
      });
    }

    await supabase.from('activity_logs').insert({
      actor_type: 'staff', actor_user_id: staff.id, action: 'reservation.admin_create',
      entity_type: 'reservation', entity_id: reservationId,
      metadata: { source, created_from: waitlistId ? 'waitlist' : 'admin_reservations', waitlist_id: waitlistId || null },
    });

    const warnings = [update.error ? 'La reserva se creó, pero la nota interna no pudo guardarse.' : null, waitlistWarning].filter(Boolean);
    return NextResponse.json({ ok: true, reservationId, confirmationCode, warning: warnings.length ? warnings.join(' ') : null }, { status: 201 });
  } catch (error) {
    if (holdId && sessionId) {
      try { await releaseHold(holdId, sessionId); } catch { /* best effort */ }
    }
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
