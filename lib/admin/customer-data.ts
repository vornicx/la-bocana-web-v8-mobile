import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { CustomerSummary } from './types';

type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  preferences: string | null;
  allergies: string | null;
  internal_notes: string | null;
  created_at: string;
};

type CustomerStatsRow = {
  customer_id: string;
  total_reservations: number;
  completed_visits: number;
  cancellations: number;
  no_shows: number;
  active_reservations: number;
  total_covers: number;
  typical_party_size: number | null;
  first_visit: string | null;
  last_visit: string | null;
};

export async function loadCustomerSummaries(): Promise<CustomerSummary[]> {
  const supabase = createAdminClient();
  const customersResult = await supabase
    .from('customers')
    .select('id, first_name, last_name, email, phone, preferences, allergies, internal_notes, created_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (customersResult.error) throw new Error(`No se pudieron cargar los clientes: ${customersResult.error.message}`);

  const customers = (customersResult.data ?? []) as CustomerRow[];
  const ids = customers.map((customer) => customer.id);
  const statsResult = ids.length
    ? await supabase
        .from('customer_operational_stats')
        .select('customer_id, total_reservations, completed_visits, cancellations, no_shows, active_reservations, total_covers, typical_party_size, first_visit, last_visit')
        .in('customer_id', ids)
    : { data: [], error: null };

  if (statsResult.error) throw new Error(`No se pudo cargar el resumen de clientes: ${statsResult.error.message}`);

  const stats = new Map(((statsResult.data ?? []) as CustomerStatsRow[]).map((row) => [String(row.customer_id), row]));

  return customers.map((customer) => {
    const summary = stats.get(customer.id);
    return {
      id: customer.id,
      name: `${customer.first_name} ${customer.last_name}`.trim(),
      email: customer.email,
      phone: customer.phone,
      preferences: customer.preferences,
      allergies: customer.allergies,
      internalNotes: customer.internal_notes,
      totalReservations: Number(summary?.total_reservations ?? 0),
      completedVisits: Number(summary?.completed_visits ?? 0),
      cancellations: Number(summary?.cancellations ?? 0),
      noShows: Number(summary?.no_shows ?? 0),
      activeReservations: Number(summary?.active_reservations ?? 0),
      totalCovers: Number(summary?.total_covers ?? 0),
      typicalPartySize: summary?.typical_party_size == null ? null : Number(summary.typical_party_size),
      firstVisit: summary?.first_visit ?? null,
      lastVisit: summary?.last_visit ?? null,
    } satisfies CustomerSummary;
  });
}
