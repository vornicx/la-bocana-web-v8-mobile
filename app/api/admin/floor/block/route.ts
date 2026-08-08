import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const tableId = String(body.tableId ?? '');
    const serviceId = String(body.serviceId ?? '');
    const date = String(body.date ?? '');
    const blocked = body.blocked === true;
    const reason = String(body.reason ?? 'Bloqueo manual de sala').slice(0, 300);
    if (!tableId || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Datos de bloqueo inválidos.');

    const { error } = await createAdminClient().rpc('admin_set_table_block_for_service', {
      p_table_id: tableId,
      p_service_id: serviceId,
      p_date: date,
      p_blocked: blocked,
      p_reason: reason,
      p_actor_user_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
