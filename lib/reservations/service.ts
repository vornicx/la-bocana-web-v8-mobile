import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/security/request';
import type { AvailabilityInput, AvailabilitySlot, CustomerDetails, HoldInput, HoldResult } from './types';

function dbError(message: string, error?: { message?: string } | null) {
  console.error(`[La Bocana] ${message}`, error?.message ?? 'Error de base de datos sin detalle');
  const publicError = new Error(`${message}. Inténtalo de nuevo en unos minutos.`);
  (publicError as Error & { status?: number }).status = 503;
  return publicError;
}

function expectedError(error: { message?: string } | null | undefined, codes: string[], message: string, status = 409) {
  const detail = (error?.message ?? '').toUpperCase();
  if (!codes.some((code) => detail.includes(code))) return null;
  const publicError = new Error(message);
  (publicError as Error & { status?: number }).status = status;
  return publicError;
}

export async function getAvailability(input: AvailabilityInput): Promise<AvailabilitySlot[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: input.date,
    p_adults: input.adults,
    p_children: input.children,
    p_area_preference_id: input.areaPreferenceId ?? null,
  });
  if (error) throw dbError('No se pudo calcular la disponibilidad', error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    serviceId: String(row.service_id),
    serviceName: String(row.service_name),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    durationMinutes: Number(row.duration_minutes),
  }));
}

export async function createHold(input: HoldInput): Promise<HoldResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('create_reservation_hold_atomic', {
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_adults: input.adults,
    p_children: input.children,
    p_session_id: input.sessionId,
    p_area_preference_id: input.areaPreferenceId ?? null,
    p_exclude_reservation_id: input.excludeReservationId ?? null,
  });
  if (error) throw expectedError(error, ['CAPACITY_FULL', 'NO_TABLE_ALLOCATION', 'CLOSED', 'SERVICE_NOT_AVAILABLE'], 'Esa hora acaba de dejar de estar disponible. Elige otra opción.') ?? dbError('No se pudo bloquear la mesa', error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('No se pudo bloquear la mesa.');
  return {
    holdId: String(row.hold_id),
    expiresAt: String(row.expires_at),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
  };
}

export async function releaseHold(holdId: string, sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('release_reservation_hold', {
    p_hold_id: holdId,
    p_session_id: sessionId,
  });
  if (error) throw dbError('No se pudo liberar el bloqueo', error);
  return data === true;
}

export async function confirmReservation(holdId: string, customer: CustomerDetails) {
  const supabase = createAdminClient();
  const managementToken = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(managementToken);
  const confirmationCode = `LB-${randomBytes(6).toString('hex').toUpperCase()}`;

  const { data, error } = await supabase.rpc('confirm_reservation_from_hold_atomic', {
    p_hold_id: holdId,
    p_first_name: customer.firstName,
    p_last_name: customer.lastName,
    p_email: customer.email,
    p_phone: customer.phone,
    p_allergies: customer.allergies ?? null,
    p_preferences: customer.preferences ?? null,
    p_notes: customer.notes ?? null,
    p_management_token_hash: tokenHash,
    p_confirmation_code: confirmationCode,
    p_source: 'website',
  });
  if (error) throw expectedError(error, ['HOLD_NOT_FOUND', 'HOLD_EXPIRED', 'TABLE_CONFLICT', 'CAPACITY_FULL'], 'El bloqueo temporal ha caducado o la mesa ya no está disponible. Elige de nuevo una hora.') ?? dbError('No se pudo confirmar la reserva', error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('No se pudo confirmar la reserva.');
  return {
    reservationId: String(row.reservation_id),
    confirmationCode: String(row.confirmation_code),
    status: String(row.status),
    managementToken,
  };
}

export async function getManagedReservation(token: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_reservation_by_management_token', {
    p_management_token_hash: hashToken(token),
  });
  if (error) throw dbError('No se pudo cargar la reserva', error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as Record<string, unknown>;
}

export async function cancelManagedReservation(token: string, reason?: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('cancel_reservation_by_management_token', {
    p_management_token_hash: hashToken(token),
    p_reason: reason ?? null,
  });
  if (error) throw expectedError(error, ['RESERVATION_NOT_MODIFIABLE', 'RESERVATION_NOT_FOUND'], 'La reserva ya no admite esta cancelación.') ?? dbError('No se pudo cancelar la reserva', error);
  return data === true;
}

export async function modifyManagedReservation(params: {
  token: string;
  date: string;
  serviceId: string;
  startsAt: string;
  adults: number;
  children: number;
  areaPreferenceId?: string | null;
  sessionId: string;
}) {
  const current = await getManagedReservation(params.token);
  if (!current?.id) throw new Error('Reserva no encontrada.');
  const hold = await createHold({
    date: params.date,
    serviceId: params.serviceId,
    startsAt: params.startsAt,
    adults: params.adults,
    children: params.children,
    areaPreferenceId: params.areaPreferenceId,
    sessionId: params.sessionId,
    excludeReservationId: String(current.id),
  });
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('modify_reservation_from_hold_atomic', {
    p_management_token_hash: hashToken(params.token),
    p_hold_id: hold.holdId,
  });
  if (error) throw expectedError(error, ['HOLD_EXPIRED', 'TABLE_CONFLICT', 'CAPACITY_FULL', 'RESERVATION_NOT_MODIFIABLE'], 'No se pudo aplicar el cambio porque la nueva mesa ya no está disponible. La reserva anterior sigue intacta.') ?? dbError('No se pudo modificar la reserva; la reserva anterior sigue intacta', error);
  return data === true;
}

export async function joinWaitlist(input: {
  date: string;
  serviceId?: string | null;
  adults: number;
  children: number;
  preferredTime?: string | null;
  flexibleFrom?: string | null;
  flexibleTo?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('join_waitlist', {
    p_date: input.date,
    p_service_id: input.serviceId ?? null,
    p_adults: input.adults,
    p_children: input.children,
    p_preferred_time: input.preferredTime ?? null,
    p_flexible_from: input.flexibleFrom ?? null,
    p_flexible_to: input.flexibleTo ?? null,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_email: input.email,
    p_phone: input.phone,
  });
  if (error) throw dbError('No se pudo añadir a la lista de espera', error);
  return String(data);
}
