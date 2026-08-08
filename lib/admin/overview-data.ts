import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { loadFloorSnapshot } from './floor-data';
import type { AdminReservation } from './types';

const ACTIVE_RESERVATION_STATUSES = new Set(['pending', 'confirmed', 'seated', 'completed']);

type WaitlistRow = {
  id: string;
  party_size: number;
  preferred_time: string | null;
  flexible_from: string | null;
  flexible_to: string | null;
  created_at: string;
  customers: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[] | null;
};

type WeekReservationRow = { reservation_date: string; party_size: number; status: string; service_id: string };
type CapacityRuleRow = { service_id: string; day_of_week: number; max_covers: number | null };
type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  preferences: string | null;
  allergies: string | null;
  internal_notes: string | null;
  last_seen_at: string | null;
  created_at: string;
};
type CustomerVisitRow = { customer_id: string | null; starts_at: string; party_size: number; status: string };

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function todayMadrid() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function mondayOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function relationOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function shortTime(value: string | null) {
  return value ? value.slice(0, 5) : 'Flexible';
}

function activeCovers(rows: WeekReservationRow[]) {
  return rows.reduce((sum, row) => ACTIVE_RESERVATION_STATUSES.has(row.status) ? sum + Number(row.party_size) : sum, 0);
}

export async function loadDashboardData(date: string) {
  const supabase = createAdminClient();
  const weekStart = mondayOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const [snapshot, waitlistResult, weekResult, rulesResult] = await Promise.all([
    loadFloorSnapshot(date),
    supabase.from('waitlist')
      .select('id, party_size, preferred_time, flexible_from, flexible_to, created_at, customers(first_name, last_name)')
      .eq('desired_date', date).in('status', ['waiting', 'offered']).order('created_at').limit(8),
    supabase.from('reservations')
      .select('reservation_date, party_size, status, service_id')
      .gte('reservation_date', weekStart).lte('reservation_date', weekEnd).order('reservation_date'),
    supabase.from('availability_rules').select('service_id, day_of_week, max_covers').eq('active', true),
  ]);

  if (waitlistResult.error) throw new Error(`No se pudo cargar la lista de espera: ${waitlistResult.error.message}`);
  if (weekResult.error) throw new Error(`No se pudo cargar la semana: ${weekResult.error.message}`);
  if (rulesResult.error) throw new Error(`No se pudo cargar la capacidad: ${rulesResult.error.message}`);

  const weekRows = (weekResult.data ?? []) as WeekReservationRow[];
  const rules = (rulesResult.data ?? []) as CapacityRuleRow[];
  const activeToday = snapshot.reservations.filter((reservation) => ACTIVE_RESERVATION_STATUSES.has(reservation.status));
  const covers = activeToday.reduce((sum, reservation) => sum + reservation.partySize, 0);
  const capacityByService = new Map<string, number>();
  const dateDow = new Date(`${date}T12:00:00Z`).getUTCDay();
  for (const rule of rules.filter((item) => Number(item.day_of_week) === dateDow)) {
    if (rule.max_covers == null) continue;
    capacityByService.set(String(rule.service_id), Math.max(capacityByService.get(String(rule.service_id)) ?? 0, Number(rule.max_covers)));
  }
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

  const openDays = new Set(rules.map((rule) => Number(rule.day_of_week)));
  const week = Array.from({ length: 7 }, (_, index) => {
    const value = addDays(weekStart, index);
    const dayRows = weekRows.filter((row) => row.reservation_date === value);
    const dow = new Date(`${value}T12:00:00Z`).getUTCDay();
    return { date: value, covers: activeCovers(dayRows), closed: !openDays.has(dow), active: value === date };
  });

  const services = snapshot.services.map((service) => {
    const serviceRows = activeToday.filter((reservation) => reservation.serviceId === service.id);
    const serviceCovers = serviceRows.reduce((sum, reservation) => sum + reservation.partySize, 0);
    const capacity = capacityByService.get(service.id) ?? 0;
    return { id: service.id, name: service.name, covers: serviceCovers, capacity, occupancy: capacity ? Math.min(100, Math.round((serviceCovers / capacity) * 100)) : 0 };
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

export async function loadCustomersData() {
  const supabase = createAdminClient();
  const customersResult = await supabase.from('customers')
    .select('id, first_name, last_name, email, phone, preferences, allergies, internal_notes, last_seen_at, created_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false }).limit(100);
  if (customersResult.error) throw new Error(`No se pudieron cargar los clientes: ${customersResult.error.message}`);
  const customers = (customersResult.data ?? []) as CustomerRow[];
  const ids = customers.map((customer) => customer.id);
  const visitsResult = ids.length
    ? await supabase.from('reservations').select('customer_id, starts_at, party_size, status').in('customer_id', ids).order('starts_at', { ascending: false })
    : { data: [], error: null };
  if (visitsResult.error) throw new Error(`No se pudo cargar el historial: ${visitsResult.error.message}`);

  const visitsByCustomer = new Map<string, CustomerVisitRow[]>();
  for (const visit of (visitsResult.data ?? []) as CustomerVisitRow[]) {
    if (!visit.customer_id || ['cancelled', 'no_show'].includes(visit.status)) continue;
    visitsByCustomer.set(visit.customer_id, [...(visitsByCustomer.get(visit.customer_id) ?? []), visit]);
  }

  return customers.map((customer) => {
    const visits = visitsByCustomer.get(customer.id) ?? [];
    return {
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      email: customer.email,
      phone: customer.phone,
      preferences: customer.preferences,
      allergies: customer.allergies,
      internalNotes: customer.internal_notes,
      visits: visits.length,
      totalCovers: visits.reduce((sum, visit) => sum + Number(visit.party_size), 0),
      lastVisit: visits[0]?.starts_at ?? customer.last_seen_at,
    };
  });
}

export async function loadCalendarData(anchor: string) {
  const supabase = createAdminClient();
  const start = mondayOfWeek(anchor);
  const end = addDays(start, 6);
  const [reservationsResult, servicesResult, rulesResult] = await Promise.all([
    supabase.from('reservations').select('reservation_date, party_size, status, service_id').gte('reservation_date', start).lte('reservation_date', end).order('reservation_date'),
    supabase.from('services').select('id, name, slug').eq('active', true).order('slug'),
    supabase.from('availability_rules').select('service_id, day_of_week, max_covers').eq('active', true),
  ]);
  if (reservationsResult.error) throw new Error(`No se pudo cargar el calendario: ${reservationsResult.error.message}`);
  if (servicesResult.error) throw new Error(`No se pudieron cargar los servicios: ${servicesResult.error.message}`);
  if (rulesResult.error) throw new Error(`No se pudo cargar la capacidad: ${rulesResult.error.message}`);

  const rows = (reservationsResult.data ?? []) as WeekReservationRow[];
  const services = (servicesResult.data ?? []).map((service) => ({ id: String(service.id), name: String(service.name) }));
  const rules = (rulesResult.data ?? []) as CapacityRuleRow[];
  const today = todayMadrid();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    const dayRows = rows.filter((row) => row.reservation_date === date && ACTIVE_RESERVATION_STATUSES.has(row.status));
    const serviceMetrics = services.map((service) => {
      const covers = dayRows.filter((row) => row.service_id === service.id).reduce((sum, row) => sum + Number(row.party_size), 0);
      const capacity = rules.filter((rule) => Number(rule.day_of_week) === dow && String(rule.service_id) === service.id && rule.max_covers != null)
        .reduce((max, rule) => Math.max(max, Number(rule.max_covers)), 0);
      return { ...service, covers, capacity, occupancy: capacity ? Math.min(100, Math.round((covers / capacity) * 100)) : 0 };
    });
    return { date, active: date === today, closed: !rules.some((rule) => Number(rule.day_of_week) === dow), covers: activeCovers(dayRows), reservations: dayRows.length, services: serviceMetrics };
  });
  return { start, end, previous: addDays(start, -7), next: addDays(start, 7), days };
}

export async function loadSettingsData() {
  const supabase = createAdminClient();
  const names = ['services', 'areas', 'tables', 'table_combinations', 'availability_rules', 'users'] as const;
  const results = await Promise.all(names.map((name) => supabase.from(name).select('id', { count: 'exact', head: true })));
  const counts: Record<(typeof names)[number], number> = { services: 0, areas: 0, tables: 0, table_combinations: 0, availability_rules: 0, users: 0 };
  results.forEach((result, index) => {
    if (result.error) throw new Error(`No se pudo verificar ${names[index]}: ${result.error.message}`);
    counts[names[index]] = result.count ?? 0;
  });
  return counts;
}

export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', ...options,
  }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

export function dashboardReservationLabel(reservation: AdminReservation) {
  return `${reservation.partySize} pax · ${reservation.table ?? 'mesa pendiente'}`;
}
