import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminReservation, AdminService, DiningTable, FloorSnapshot, TableCombination } from './types';

type TableRow = { id: string; area_id: string; name: string; min_capacity: number; max_capacity: number; position_x: number | string | null; position_y: number | string | null; shape: string; areas?: { name?: string; slug?: string } | { name?: string; slug?: string }[] | null };
type ServiceRow = { id: string; name: string; slug: string; default_duration_minutes: number };
type RuleRow = { service_id: string; open_time: string | null; close_time: string | null };
type ReservationRow = { id: string; customer_id: string | null; service_id: string; starts_at: string; ends_at: string; duration_minutes: number; adults: number; children: number; party_size: number; status: AdminReservation['status']; source: string; customer_name: string; customer_email: string | null; customer_phone: string | null; allergies: string | null; preferences: string | null; notes: string | null; internal_notes: string | null; area_preference_id: string | null; confirmation_code: string };
type CombinationRow = { id: string; name: string; min_capacity: number; max_capacity: number };
type MemberRow = { combination_id: string; table_id: string };
type ClosureRow = { table_id: string | null; service_id: string | null; reason: string | null; starts_at: string; ends_at: string };
type AssignmentRow = { reservation_id: string; table_id: string };

function asArea(value: string | null | undefined): DiningTable['area'] {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('terraza')) return 'Terraza';
  if (normalized.includes('barra')) return 'Barra';
  return 'Interior';
}

function tableSize(capacity: number, shape: string) {
  if (shape === 'round') {
    if (capacity <= 2) return { w: 9, h: 13 };
    if (capacity <= 4) return { w: 11, h: 15 };
    return { w: 13, h: 17 };
  }
  if (capacity <= 4) return { w: 12, h: 14 };
  if (capacity <= 6) return { w: 15, h: 15 };
  return { w: 18, h: 16 };
}

function localTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

function localDateKey(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(iso));
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export async function loadFloorSnapshot(date: string): Promise<FloorSnapshot> {
  const supabase = createAdminClient();
  const dow = new Date(`${date}T12:00:00Z`).getUTCDay();

  const [tablesResult, servicesResult, rulesResult, reservationsResult, combinationsResult, membersResult, closuresResult] = await Promise.all([
    supabase.from('tables').select('id, area_id, name, min_capacity, max_capacity, active, position_x, position_y, shape, areas(name, slug)').eq('active', true).order('name'),
    supabase.from('services').select('id, name, slug, default_duration_minutes, active').eq('active', true).order('slug'),
    supabase.from('availability_rules').select('service_id, open_time, close_time').eq('active', true).eq('day_of_week', dow),
    supabase.from('reservations').select('id, customer_id, service_id, starts_at, ends_at, duration_minutes, adults, children, party_size, status, source, customer_name, customer_email, customer_phone, allergies, preferences, notes, internal_notes, area_preference_id, confirmation_code').eq('reservation_date', date).order('starts_at'),
    supabase.from('table_combinations').select('id, name, min_capacity, max_capacity').eq('active', true).order('name'),
    supabase.from('table_combination_members').select('combination_id, table_id'),
    supabase.from('closures').select('table_id, service_id, reason, starts_at, ends_at').eq('active', true).not('table_id', 'is', null),
  ]);

  for (const result of [tablesResult, servicesResult, rulesResult, reservationsResult, combinationsResult, membersResult, closuresResult]) {
    if (result.error) throw new Error(`No se pudo cargar la sala: ${result.error.message}`);
  }

  const reservationRows = (reservationsResult.data ?? []) as ReservationRow[];
  const reservationIds = reservationRows.map((row) => String(row.id));
  const assignmentsResult = reservationIds.length
    ? await supabase.from('reservation_tables').select('reservation_id, table_id').in('reservation_id', reservationIds)
    : { data: [], error: null };
  if (assignmentsResult.error) throw new Error(`No se pudieron cargar las asignaciones: ${assignmentsResult.error.message}`);

  const tableRows = (tablesResult.data ?? []) as TableRow[];
  const tableById = new Map(tableRows.map((row) => [String(row.id), row]));
  const assignments = new Map<string, string[]>();
  for (const row of (assignmentsResult.data ?? []) as AssignmentRow[]) {
    const reservationId = String(row.reservation_id);
    assignments.set(reservationId, [...(assignments.get(reservationId) ?? []), String(row.table_id)]);
  }

  const rulesByService = new Map<string, { openTime: string | null; closeTime: string | null }>();
  for (const row of (rulesResult.data ?? []) as RuleRow[]) {
    const id = String(row.service_id);
    const current = rulesByService.get(id) ?? { openTime: null, closeTime: null };
    const open = row.open_time ? String(row.open_time).slice(0, 5) : null;
    const close = row.close_time ? String(row.close_time).slice(0, 5) : null;
    rulesByService.set(id, {
      openTime: current.openTime && open ? (current.openTime < open ? current.openTime : open) : (current.openTime ?? open),
      closeTime: current.closeTime && close ? (current.closeTime > close ? current.closeTime : close) : (current.closeTime ?? close),
    });
  }

  const services: AdminService[] = ((servicesResult.data ?? []) as ServiceRow[]).map((row) => {
    const window = rulesByService.get(String(row.id));
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      defaultDuration: Number(row.default_duration_minutes),
      openTime: window?.openTime ?? null,
      closeTime: window?.closeTime ?? null,
    };
  });
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const closuresByTable = new Map<string, { serviceIds: string[]; reason: string | null }>();
  for (const row of (closuresResult.data ?? []) as ClosureRow[]) {
    if (!row.table_id) continue;
    const startDate = localDateKey(String(row.starts_at));
    const endDate = localDateKey(String(row.ends_at));
    if (!(startDate <= date && endDate >= date)) continue;
    const id = String(row.table_id);
    const current = closuresByTable.get(id) ?? { serviceIds: [], reason: null };
    if (row.service_id) current.serviceIds.push(String(row.service_id));
    else current.serviceIds = services.map((service) => service.id);
    current.reason = row.reason ? String(row.reason) : current.reason;
    closuresByTable.set(id, current);
  }

  const tables: DiningTable[] = tableRows.map((row) => {
    const capacity = Number(row.max_capacity);
    const size = tableSize(capacity, String(row.shape));
    const areaRelation = Array.isArray(row.areas) ? row.areas[0] : row.areas;
    const closure = closuresByTable.get(String(row.id));
    return {
      id: String(row.id),
      label: String(row.name),
      seats: capacity,
      minSeats: Number(row.min_capacity),
      areaId: String(row.area_id),
      area: asArea(areaRelation?.name ? String(areaRelation.name) : null),
      x: Number(row.position_x ?? 10),
      y: Number(row.position_y ?? 10),
      w: size.w,
      h: size.h,
      shape: String(row.shape) === 'round' ? 'round' : 'rect',
      state: 'free',
      blockedReason: closure?.reason ?? null,
      blockedServiceIds: [...new Set(closure?.serviceIds ?? [])],
    };
  });

  const reservations: AdminReservation[] = reservationRows.map((row) => {
    const tableIds = assignments.get(String(row.id)) ?? [];
    const assignedTables = tableIds.map((id) => tableById.get(id)).filter(Boolean);
    const firstTable = assignedTables[0];
    const areaRelation = firstTable ? (Array.isArray(firstTable.areas) ? firstTable.areas[0] : firstTable.areas) : null;
    const customerId = row.customer_id ? String(row.customer_id) : null;
    const rawSource = String(row.source);
    const source: AdminReservation['source'] = ['website', 'phone', 'walk_in', 'admin', 'instagram', 'google', 'other'].includes(rawSource)
      ? rawSource as AdminReservation['source']
      : 'admin';
    return {
      id: String(row.id),
      customerId,
      confirmationCode: String(row.confirmation_code),
      serviceId: String(row.service_id),
      serviceName: serviceById.get(String(row.service_id))?.name,
      startsAt: String(row.starts_at),
      endsAt: String(row.ends_at),
      time: localTime(String(row.starts_at)),
      duration: Number(row.duration_minutes),
      customer: String(row.customer_name),
      phone: row.customer_phone ? String(row.customer_phone) : 'Sin teléfono',
      email: row.customer_email ? String(row.customer_email) : undefined,
      partySize: Number(row.party_size),
      adults: Number(row.adults),
      children: Number(row.children),
      tableIds,
      table: assignedTables.length ? assignedTables.map((table) => String(table?.name)).join(' + ') : null,
      area: asArea(areaRelation?.name ? String(areaRelation.name) : null),
      status: row.status as AdminReservation['status'],
      source,
      notes: row.notes ? String(row.notes) : undefined,
      preferences: row.preferences ? String(row.preferences) : undefined,
      internalNotes: row.internal_notes ? String(row.internal_notes) : undefined,
      allergies: row.allergies ? String(row.allergies) : undefined,
      visits: 0,
    };
  });

  const membersByCombination = new Map<string, string[]>();
  for (const row of (membersResult.data ?? []) as MemberRow[]) {
    const id = String(row.combination_id);
    membersByCombination.set(id, [...(membersByCombination.get(id) ?? []), String(row.table_id)]);
  }
  const combinations: TableCombination[] = ((combinationsResult.data ?? []) as CombinationRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    tableIds: membersByCombination.get(String(row.id)) ?? [],
    minCapacity: Number(row.min_capacity),
    maxCapacity: Number(row.max_capacity),
  }));

  return { date, generatedAt: new Date().toISOString(), services, tables, reservations, combinations };
}
