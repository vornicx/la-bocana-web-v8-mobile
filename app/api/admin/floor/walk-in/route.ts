import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const serviceId = String(body.serviceId ?? '');
    const tableIds = Array.isArray(body.tableIds) ? body.tableIds.map(String) : [];
    const name = String(body.name ?? 'Walk-in').slice(0, 160);
    const partySize = Number(body.partySize);
    const duration = Number(body.duration);
    if (!serviceId || !tableIds.length || !Number.isInteger(partySize) || partySize < 1 || !Number.isInteger(duration)) {
      throw new Error('Datos del walk-in inválidos.');
    }

    const { data, error } = await createAdminClient().rpc('admin_create_walk_in', {
      p_service_id: serviceId,
      p_table_ids: tableIds,
      p_name: name,
      p_party_size: partySize,
      p_duration_minutes: duration,
      p_starts_at: new Date().toISOString(),
      p_actor_user_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, reservationId: data }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
