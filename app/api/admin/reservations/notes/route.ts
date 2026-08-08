import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const reservationId = String(body.reservationId ?? '');
    if (!reservationId) throw new Error('Reserva inválida.');
    const { error } = await createAdminClient().rpc('admin_update_reservation_notes', {
      p_reservation_id: reservationId,
      p_notes: String(body.notes ?? '').slice(0, 1500),
      p_preferences: String(body.preferences ?? '').slice(0, 1000),
      p_allergies: String(body.allergies ?? '').slice(0, 1000),
      p_internal_notes: String(body.internalNotes ?? '').slice(0, 2000),
      p_actor_user_id: staff.id,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
