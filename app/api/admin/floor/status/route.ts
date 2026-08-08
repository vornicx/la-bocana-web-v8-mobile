import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ReservationStatus } from '@/lib/admin/types';

const allowed = new Set<ReservationStatus>(['confirmed', 'seated', 'completed', 'cancelled', 'no_show']);

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const reservationId = String(body.reservationId ?? '');
    const status = String(body.status ?? '') as ReservationStatus;
    if (!reservationId || !allowed.has(status)) throw new Error('Estado inválido.');

    const { error } = await createAdminClient().rpc('admin_transition_reservation', {
      p_reservation_id: reservationId,
      p_status: status,
      p_actor_user_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
