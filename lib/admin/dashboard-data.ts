import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminReservation, ReservationStatus } from './types';

const ACTIVE_STATUSES = new Set<ReservationStatus>(['pending', 'confirmed', 'seated', 'completed']);

type ReservationRow = {
  id: string;
  service_id: string;
  starts_at: string;
  duration_minutes: number;
  adults: number;
  children: number;
  party_size: number;
  status: ReservationStatus;
  source: AdminReservation['source'];
  customer_name: string;
  customer_phone: string | null;
  allergies: string | null;
  confirmation_code: string;
};

type AssignmentRow = {
  reservation_id: string;
  tables: { name?: string } | { name?: string }[] | null;
};

type WaitlistRow = {
  id: string;
  party_size: number;
  preferred_time: string | null;
  flexible_from: string | null;
  flexible_to: string | null;
  created_at: string;
  customers: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
};

type WeekReservationRow = { reservation_date: string; party_size: number; status: ReservationStatus; service_id: string };
type CapacityRuleRow = { service_id: string; day_of_week: number; max_covers: number | null };
type ServiceRow = { id: string; name: string; slug: string };

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function shortTime(value: string | null) {
  return value ? value.slice(0, 5) : 'Flexible';
}

function localTime(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

export async function loadDashboardData(date: string) {
  const supabase = createAdminClient();
  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 6);

  const [todayResult, waitlistResult, weekResult, rulesResult, servicesResult] = await Promise.all([
    supabase.from('reservations')
      .select('id, service_id, starts_at, duration_minutes, adults, children, party_size, status, source, customer_name, customer_phone, allergies, confirmation_code')
      .eq('reservation_date', date)
      .order('starts_at'),
    supabase.from('waitlist')
      .select('id, party_size, preferred_time, flexible_from, flexible_to, created_at, customers(first_name, last_name)')
      .eq('desired_date', date)
      .in('status', ['waiting', 'offered'])
      .order('created_at')
      .limit(8),
    supabase.from('reservations')
      .select('reservation_date, party_size, status, service_id')
      .gte('reservation_date', weekStart)
      .lte('reservation_date', weekEnd)
      .order('reservation_date'),
    supabase.from('availability_rules')
      .select('service_id, day_of_week, max_covers')
      .eq('active', true),
    supabase.from('services')
      .select('id, name, slug')
      .eq('active', true)
      .order('slug'),
  ]);

  for (const result of [todayResult, waitlistResult, weekResult, rulesResult, servicesResult]) {
    if (result.error) throw new Error(`No se pudo cargar el resumen: ${result.error.message}`);
  }

  const todayRows = (todayResult.data ?? []) as ReservationRow[];
  const reservationIds = todayRows.map((row) => String(row.id));
  const assignmentsResult = reservationIds.length
    ? await supabase.from('reservation_tables').select('reservation_id, tables(name)').in('reservation_id', reservationIds)
    : { data: [], error: null };
  if (assignmentsResult.error) throw new Error(`No se pudieron cargar las mesas del resumen: ${assignmentsResult.error.message}`);

  const assignments = new Map<string, string[]>();
  for (const row of (assignmentsResult.data ?? []) as AssignmentRow[]) {
    const table = relationOne(row.tables);
    const reservationId = String(row.reservation_id);
    if (!table?.name) continue;
    assignments.set(reservationId, [...(assignments.get(reservationId) ?? []), String(table.name)]);
  }

  const activeToday = todayRows.filter((row) => ACTIVE_STATUSES.has(row.status)).map((row) => {
    const tableNames = assignments.get(String(row.id)) ?? [];
    return {
      id: String(row.id),
      time: localTime(String(row.starts_at)),
      startsAt: String(row.starts_at),
      duration: Number(row.duration_minutes),
      customer: String(row.customer_name),
      phone: row.customer_phone ? String(row.customer_phone) : 'Sin teléfono',
      partySize: Number(row.party_size),
      adults: Number(row.adults),
      children: Number(row.children),
      table: tableNames.length ? tableNames.join(' + ') : null,
      area: 'Interior' as const,
      status: row.status,
      source: row.source,
      allergies: row.allergies ? String(row.allergies) : undefined,
      visits: 0,
      serviceId: String(row.service_id),
      confirmationCode: String(row.confirmation_code),
    } satisfies AdminReservation;
  });

  const rules = (rulesResult.data ?? []) as CapacityRuleRow[];
  const dateDow = new Date(`${date}T12:00:00Z`).getUTCDay();
  const capacityByService = new Map<string, number>();
  for (const rule of rules) {
    if (Number(rule.day_of_week) !== dateDow || rule.max_covers == null) continue;
    const serviceId = String(rule.service_id);
    capacityByService.set(serviceId, Math.max(capacityByService.get(serviceId) ?? 0, Number(rule.max_covers)));
  }

  const covers = activeToday.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const totalCapacity = [...capacityByService.values()].reduce((sum, capacity) => sum + capacity, 0);
  const now = Date.now();
  const upcoming = activeToday
    .filter((reservation) => reservation.status === 'seated' || new Date(reservation.startsAt ?? '').getTime() >= now)
    .slice(0, 6);

  const waitlist = ((waitlistResult.data ?? []) as WaitlistRow[]).map((row) => {
    const customer = relationOne(row.customers);
    return {
      id: String(row.id),
      name: [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Cliente',
      partySize: Number(row.party_size),
      time: shortTime(row.preferred_time ?? row.flexible_from),
      flexibility: row.flexible_from && row.flexible_to ? `${shortTime(row.flexible_from)}–${shortTime(row.flexible_to)}` : 'Horario flexible',
    };
  });

  const weekRows = (weekResult.data ?? []) as WeekReservationRow[];
  const openDays = new Set(rules.map((rule) => Number(rule.day_of_week)));
  const week = Array.from({ length: 7 }, (_, index) => {
    const value = addDays(weekStart, index);
    const dayRows = weekRows.filter((row) => row.reservation_date === value && ACTIVE_STATUSES.has(row.status));
    const dow = new Date(`${value}T12:00:00Z`).getUTCDay();
    return {
      date: value,
      covers: dayRows.reduce((sum, row) => sum + Number(row.party_size), 0),
      closed: !openDays.has(dow),
      active: value === date,
    };
  });

  const services = ((servicesResult.data ?? []) as ServiceRow[]).map((service) => {
    const serviceCovers = activeToday.filter((reservation) => reservation.serviceId === String(service.id)).reduce((sum, reservation) => sum + reservation.partySize, 0);
    const capacity = capacityByService.get(String(service.id)) ?? 0;
    return {
      id: String(service.id),
      name: String(service.name),
      covers: serviceCovers,
      capacity,
      occupancy: capacity ? Math.min(100, Math.round((serviceCovers / capacity) * 100)) : 0,
    };
  });

  return {
    date,
    metrics: {
      covers,
      reservations: activeToday.length,
      occupancy: totalCapacity ? Math.min(100, Math.round((covers / totalCapacity) * 100)) : 0,
      waitlist: waitlist.length,
      unassigned: activeToday.filter((reservation) => !reservation.table).length,
    },
    upcoming,
    waitlist,
    week,
    services,
  };
}
