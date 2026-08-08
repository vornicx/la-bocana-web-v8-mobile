import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const reservationId = String(body.reservationId ?? '');
    const tableIds = Array.isArray(body.tableIds) ? body.tableIds.map(String) : [];
    if (!reservationId || !tableIds.length) throw new Error('Selecciona una reserva y al menos una mesa.');

    const { error } = await createAdminClient().rpc('admin_assign_reservation_tables', {
      p_reservation_id: reservationId,
      p_table_ids: tableIds,
      p_actor_user_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
