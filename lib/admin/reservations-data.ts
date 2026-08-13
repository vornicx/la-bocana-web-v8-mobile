import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminReservation, AdminService, DiningTable, FloorSnapshot, TableCombination } from './types';

type AreaRelation = { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
type TableRow = { id: string; area_id: string; name: string; min_capacity: number; max_capacity: number; areas?: AreaRelation };
type ServiceRow = { id: string; name: string; slug: string; default_duration_minutes: number };
type ReservationRow = { id: string; customer_id: string | null; service_id: string; starts_at: string; ends_at: string; duration_minutes: number; adults: number; children: number; party_size: number; status: AdminReservation['status']; source: string; customer_name: string; customer_email: string | null; customer_phone: string | null; allergies: string | null; preferences: string | null; notes: string | null; internal_notes: string | null; area_preference_id: string | null; confirmation_code: string };
type CombinationRow = { id: string; name: string; min_capacity: number; max_capacity: number };
type MemberRow = { combination_id: string; table_id: string };
type AssignmentRow = { reservation_id: string; table_id: string };
type VisitRow = { customer_id: string | null };

function relationOne(value: AreaRelation) {
  return Array.isArray(value) ? value[0] : value;
}

function asArea(value: string | null | undefined): DiningTable['area'] {
  const normalized = (value ?? '').toLowerCase();
  if (normalized.includes('terraza')) return 'Terraza';
  if (normalized.includes('barra')) return 'Barra';
  return 'Interior';
}

function localTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export async function loadReservationsSnapshot(date: string): Promise<FloorSnapshot> {
  const supabase = createAdminClient();
  const [tablesResult, servicesResult, reservationsResult, combinationsResult, membersResult] = await Promise.all([
    supabase.from('tables').select('id, area_id, name, min_capacity, max_capacity, areas(name, slug)').eq('active', true).order('name'),
    supabase.from('services').select('id, name, slug, default_duration_minutes').eq('active', true).order('slug'),
    supabase.from('reservations').select('id, customer_id, service_id, starts_at, ends_at, duration_minutes, adults, children, party_size, status, source, customer_name, customer_email, customer_phone, allergies, preferences, notes, internal_notes, area_preference_id, confirmation_code').eq('reservation_date', date).order('starts_at'),
    supabase.from('table_combinations').select('id, name, min_capacity, max_capacity').eq('active', true).order('name'),
    supabase.from('table_combination_members').select('combination_id, table_id'),
  ]);

  for (const result of [tablesResult, servicesResult, reservationsResult, combinationsResult, membersResult]) {
    if (result.error) throw new Error(`No se pudieron cargar las reservas: ${result.error.message}`);
  }

  const reservationRows = (reservationsResult.data ?? []) as ReservationRow[];
  const reservationIds = reservationRows.map((row) => String(row.id));
  const customerIds = [...new Set(reservationRows.map((row) => row.customer_id ? String(row.customer_id) : null).filter(Boolean))] as string[];

  const [assignmentsResult, visitsResult] = await Promise.all([
    reservationIds.length
      ? supabase.from('reservation_tables').select('reservation_id, table_id').in('reservation_id', reservationIds)
      : Promise.resolve({ data: [], error: null }),
    customerIds.length
      ? supabase.from('reservations').select('customer_id').in('customer_id', customerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (assignmentsResult.error) throw new Error(`No se pudieron cargar las mesas: ${assignmentsResult.error.message}`);
  if (visitsResult.error) throw new Error(`No se pudo cargar el historial de clientes: ${visitsResult.error.message}`);

  const tableRows = (tablesResult.data ?? []) as TableRow[];
  const tableById = new Map(tableRows.map((row) => [String(row.id), row]));
  const assignments = new Map<string, string[]>();
  for (const row of (assignmentsResult.data ?? []) as AssignmentRow[]) {
    const id = String(row.reservation_id);
    assignments.set(id, [...(assignments.get(id) ?? []), String(row.table_id)]);
  }

  const visitCount = new Map<string, number>();
  for (const row of (visitsResult.data ?? []) as VisitRow[]) {
    if (!row.customer_id) continue;
    const id = String(row.customer_id);
    visitCount.set(id, (visitCount.get(id) ?? 0) + 1);
  }

  const tables: DiningTable[] = tableRows.map((row, index) => {
    const relation = relationOne(row.areas ?? null);
    return {
      id: String(row.id), label: String(row.name), seats: Number(row.max_capacity), minSeats: Number(row.min_capacity), areaId: String(row.area_id),
      area: asArea(relation?.name ? String(relation.name) : null), x: 0, y: index, w: 0, h: 0, shape: 'rect', state: 'free', blockedReason: null, blockedServiceIds: [],
    };
  });

  const services: AdminService[] = ((servicesResult.data ?? []) as ServiceRow[]).map((row) => ({
    id: String(row.id), name: String(row.name), slug: String(row.slug), defaultDuration: Number(row.default_duration_minutes), openTime: null, closeTime: null,
  }));
  const serviceById = new Map(services.map((service) => [service.id, service]));

  const reservations: AdminReservation[] = reservationRows.map((row) => {
    const tableIds = assignments.get(String(row.id)) ?? [];
    const assigned = tableIds.map((id) => tableById.get(id)).filter(Boolean) as TableRow[];
    const first = assigned[0];
    const areaRelation = first ? relationOne(first.areas ?? null) : null;
    const customerId = row.customer_id ? String(row.customer_id) : null;
    const rawSource = String(row.source);
    const source: AdminReservation['source'] = ['website', 'phone', 'walk_in', 'admin', 'instagram', 'google', 'other'].includes(rawSource) ? rawSource as AdminReservation['source'] : 'admin';
    return {
      id: String(row.id), customerId, confirmationCode: String(row.confirmation_code), serviceId: String(row.service_id), serviceName: serviceById.get(String(row.service_id))?.name,
      startsAt: String(row.starts_at), endsAt: String(row.ends_at), time: localTime(String(row.starts_at)), duration: Number(row.duration_minutes), customer: String(row.customer_name),
      phone: row.customer_phone ? String(row.customer_phone) : 'Sin teléfono', email: row.customer_email ? String(row.customer_email) : undefined,
      partySize: Number(row.party_size), adults: Number(row.adults), children: Number(row.children), tableIds,
      table: assigned.length ? assigned.map((table) => String(table.name)).join(' + ') : null,
      area: asArea(areaRelation?.name ? String(areaRelation.name) : null), status: row.status, source,
      notes: row.notes ? String(row.notes) : undefined, preferences: row.preferences ? String(row.preferences) : undefined,
      internalNotes: row.internal_notes ? String(row.internal_notes) : undefined, allergies: row.allergies ? String(row.allergies) : undefined,
      visits: customerId ? (visitCount.get(customerId) ?? 1) : 0,
    };
  });

  const membersByCombination = new Map<string, string[]>();
  for (const row of (membersResult.data ?? []) as MemberRow[]) {
    const id = String(row.combination_id);
    membersByCombination.set(id, [...(membersByCombination.get(id) ?? []), String(row.table_id)]);
  }
  const combinations: TableCombination[] = ((combinationsResult.data ?? []) as CombinationRow[]).map((row) => ({
    id: String(row.id), name: String(row.name), tableIds: membersByCombination.get(String(row.id)) ?? [], minCapacity: Number(row.min_capacity), maxCapacity: Number(row.max_capacity),
  }));

  return { date, generatedAt: new Date().toISOString(), services, tables, reservations, combinations };
}
