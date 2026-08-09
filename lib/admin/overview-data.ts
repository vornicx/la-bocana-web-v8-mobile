import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { loadFloorSnapshot } from './floor-data';
import type { AdminReservation, AdminWaitlistItem, CustomerDetail, CustomerSummary, OperationalSettings, ReservationStatus } from './types';

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
type CustomerVisitRow = {
  id: string;
  customer_id: string | null;
  starts_at: string;
  party_size: number;
  adults: number;
  children: number;
  status: ReservationStatus;
  source: AdminReservation['source'];
  notes: string | null;
  allergies: string | null;
  preferences: string | null;
  internal_notes: string | null;
  services: { name?: string } | { name?: string }[] | null;
};

type WaitlistAdminRow = {
  id: string;
  customer_id: string | null;
  desired_date: string;
  adults: number;
  children: number;
  party_size: number;
  preferred_time: string | null;
  flexible_from: string | null;
  flexible_to: string | null;
  status: AdminWaitlistItem['status'];
  offered_at: string | null;
  offer_expires_at: string | null;
  converted_reservation_id: string | null;
  created_at: string;
  customers: { first_name?: string; last_name?: string; phone?: string | null; email?: string | null } | { first_name?: string; last_name?: string; phone?: string | null; email?: string | null }[] | null;
  services: { name?: string } | { name?: string }[] | null;
};

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

function typicalPartySize(visits: CustomerVisitRow[]) {
  if (!visits.length) return null;
  const counts = new Map<number, number>();
  for (const visit of visits) counts.set(Number(visit.party_size), (counts.get(Number(visit.party_size)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? null;
}

function customerSummary(customer: CustomerRow, reservations: CustomerVisitRow[]): CustomerSummary {
  const completed = reservations.filter((reservation) => reservation.status === 'completed');
  const chronological = [...completed].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  return {
    id: customer.id,
    name: `${customer.first_name} ${customer.last_name}`.trim(),
    email: customer.email,
    phone: customer.phone,
    preferences: customer.preferences,
    allergies: customer.allergies,
    internalNotes: customer.internal_notes,
    totalReservations: reservations.length,
    completedVisits: completed.length,
    cancellations: reservations.filter((reservation) => reservation.status === 'cancelled').length,
    noShows: reservations.filter((reservation) => reservation.status === 'no_show').length,
    activeReservations: reservations.filter((reservation) => ['pending', 'confirmed', 'seated'].includes(reservation.status)).length,
    totalCovers: completed.reduce((sum, visit) => sum + Number(visit.party_size), 0),
    typicalPartySize: typicalPartySize(completed.length ? completed : reservations),
    firstVisit: chronological[0]?.starts_at ?? null,
    lastVisit: chronological.at(-1)?.starts_at ?? null,
  };
}

const CUSTOMER_HISTORY_SELECT = 'id, customer_id, starts_at, party_size, adults, children, status, source, notes, allergies, preferences, internal_notes, services(name)';

export async function loadCustomersData(): Promise<CustomerSummary[]> {
  const supabase = createAdminClient();
  const customersResult = await supabase.from('customers')
    .select('id, first_name, last_name, email, phone, preferences, allergies, internal_notes, last_seen_at, created_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false }).limit(100);
  if (customersResult.error) throw new Error(`No se pudieron cargar los clientes: ${customersResult.error.message}`);
  const customers = (customersResult.data ?? []) as CustomerRow[];
  const ids = customers.map((customer) => customer.id);
  const visitsResult = ids.length
    ? await supabase.from('reservations').select(CUSTOMER_HISTORY_SELECT).in('customer_id', ids).order('starts_at', { ascending: false })
    : { data: [], error: null };
  if (visitsResult.error) throw new Error(`No se pudo cargar el historial: ${visitsResult.error.message}`);

  const visitsByCustomer = new Map<string, CustomerVisitRow[]>();
  for (const visit of (visitsResult.data ?? []) as CustomerVisitRow[]) {
    if (!visit.customer_id) continue;
    visitsByCustomer.set(visit.customer_id, [...(visitsByCustomer.get(visit.customer_id) ?? []), visit]);
  }

  return customers.map((customer) => customerSummary(customer, visitsByCustomer.get(customer.id) ?? []));
}

export async function loadCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const supabase = createAdminClient();
  const [customerResult, historyResult] = await Promise.all([
    supabase.from('customers').select('id, first_name, last_name, email, phone, preferences, allergies, internal_notes, last_seen_at, created_at').eq('id', id).maybeSingle(),
    supabase.from('reservations').select(CUSTOMER_HISTORY_SELECT).eq('customer_id', id).order('starts_at', { ascending: false }),
  ]);
  if (customerResult.error) throw new Error(`No se pudo cargar el cliente: ${customerResult.error.message}`);
  if (historyResult.error) throw new Error(`No se pudo cargar su historial: ${historyResult.error.message}`);
  if (!customerResult.data) return null;
  const customer = customerResult.data as CustomerRow;
  const history = (historyResult.data ?? []) as CustomerVisitRow[];
  return {
    ...customerSummary(customer, history),
    createdAt: customer.created_at,
    history: history.map((reservation) => ({
      id: reservation.id,
      startsAt: reservation.starts_at,
      partySize: Number(reservation.party_size),
      adults: Number(reservation.adults),
      children: Number(reservation.children),
      status: reservation.status,
      source: reservation.source,
      serviceName: relationOne(reservation.services)?.name ?? null,
      notes: reservation.notes,
      allergies: reservation.allergies,
      preferences: reservation.preferences,
      internalNotes: reservation.internal_notes,
    })),
  };
}

export async function loadWaitlistData(): Promise<AdminWaitlistItem[]> {
  const supabase = createAdminClient();
  const result = await supabase.from('waitlist')
    .select('id, customer_id, desired_date, adults, children, party_size, preferred_time, flexible_from, flexible_to, status, offered_at, offer_expires_at, converted_reservation_id, created_at, customers(first_name, last_name, phone, email), services(name)')
    .order('desired_date', { ascending: true }).order('created_at', { ascending: true }).limit(250);
  if (result.error) throw new Error(`No se pudo cargar la lista de espera: ${result.error.message}`);
  return ((result.data ?? []) as WaitlistAdminRow[]).map((row) => {
    const customer = relationOne(row.customers);
    return {
      id: row.id,
      customerId: row.customer_id,
      customerName: [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || 'Cliente',
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      serviceName: relationOne(row.services)?.name ?? null,
      desiredDate: row.desired_date,
      adults: Number(row.adults),
      children: Number(row.children),
      partySize: Number(row.party_size),
      preferredTime: row.preferred_time,
      flexibleFrom: row.flexible_from,
      flexibleTo: row.flexible_to,
      status: row.status,
      offeredAt: row.offered_at,
      offerExpiresAt: row.offer_expires_at,
      convertedReservationId: row.converted_reservation_id,
      createdAt: row.created_at,
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

export async function loadSettingsData(): Promise<OperationalSettings> {
  const supabase = createAdminClient();
  const [servicesResult, rulesResult, areasResult, tablesResult, combinationsResult, usersResult, closuresResult] = await Promise.all([
    supabase.from('services').select('id, name, slug, active, auto_confirm, default_duration_minutes').order('slug'),
    supabase.from('availability_rules').select('id, service_id, day_of_week, open_time, close_time, slot_interval_minutes, max_covers, min_notice_minutes, booking_horizon_days, min_party_size, max_party_size, active').order('day_of_week'),
    supabase.from('areas').select('id', { count: 'exact', head: true }),
    supabase.from('tables').select('id', { count: 'exact', head: true }),
    supabase.from('table_combinations').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('closures').select('id', { count: 'exact', head: true }).eq('active', true),
  ]);
  const results = [servicesResult, rulesResult, areasResult, tablesResult, combinationsResult, usersResult, closuresResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`No se pudo cargar la configuración: ${failed.error.message}`);
  const rules = rulesResult.data ?? [];
  return {
    services: (servicesResult.data ?? []).map((service) => ({
      id: String(service.id), name: String(service.name), slug: String(service.slug), active: Boolean(service.active),
      autoConfirm: Boolean(service.auto_confirm), defaultDurationMinutes: Number(service.default_duration_minutes),
      rules: rules.filter((rule) => String(rule.service_id) === String(service.id)).map((rule) => ({
        id: String(rule.id), serviceId: String(rule.service_id), dayOfWeek: Number(rule.day_of_week), openTime: String(rule.open_time).slice(0, 5), closeTime: String(rule.close_time).slice(0, 5),
        slotIntervalMinutes: Number(rule.slot_interval_minutes), maxCovers: rule.max_covers == null ? null : Number(rule.max_covers), minNoticeMinutes: Number(rule.min_notice_minutes),
        bookingHorizonDays: Number(rule.booking_horizon_days), minPartySize: Number(rule.min_party_size), maxPartySize: Number(rule.max_party_size), active: Boolean(rule.active),
      })),
    })),
    counts: { areas: areasResult.count ?? 0, tables: tablesResult.count ?? 0, combinations: combinationsResult.count ?? 0, users: usersResult.count ?? 0, closures: closuresResult.count ?? 0 },
  };
}

export function dateLabel(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', ...options,
  }).format(new Date(`${value}T12:00:00Z`)).replace('.', '');
}

export function dashboardReservationLabel(reservation: AdminReservation) {
  return `${reservation.partySize} pax · ${reservation.table ?? 'mesa pendiente'}`;
}
