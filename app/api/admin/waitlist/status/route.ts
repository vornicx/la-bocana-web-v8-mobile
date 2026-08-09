import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { WaitlistStatus } from '@/lib/admin/types';

const allowedTransitions: Record<WaitlistStatus, WaitlistStatus[]> = {
  waiting: ['offered', 'cancelled'],
  offered: ['waiting', 'cancelled', 'expired'],
  converted: [], expired: [], cancelled: [],
};

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const body = await request.json();
    const waitlistId = String(body.waitlistId ?? '');
    const nextStatus = String(body.status ?? '') as WaitlistStatus;
    if (!waitlistId || !Object.hasOwn(allowedTransitions, nextStatus)) throw new Error('Solicitud o estado inválidos.');
    const supabase = createAdminClient();
    const { data: current, error: currentError } = await supabase.from('waitlist').select('id, status').eq('id', waitlistId).maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error('La solicitud ya no existe.');
    const currentStatus = current.status as WaitlistStatus;
    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) throw new Error(`No se puede pasar de ${currentStatus} a ${nextStatus}.`);

    const offeredAt = nextStatus === 'offered' ? new Date() : null;
    const offerExpiresAt = offeredAt ? new Date(offeredAt.getTime() + 15 * 60_000) : null;
    const { error: updateError } = await supabase.from('waitlist').update({
      status: nextStatus,
      offered_at: offeredAt?.toISOString() ?? null,
      offer_expires_at: offerExpiresAt?.toISOString() ?? null,
    }).eq('id', waitlistId).eq('status', currentStatus);
    if (updateError) throw new Error(updateError.message);

    await supabase.from('activity_logs').insert({
      actor_type: 'staff', actor_user_id: staff.id, action: 'waitlist_status_changed', entity_type: 'waitlist', entity_id: waitlistId,
      metadata: { from: currentStatus, to: nextStatus },
    });
    return NextResponse.json({ ok: true, offeredAt: offeredAt?.toISOString() ?? null, offerExpiresAt: offerExpiresAt?.toISOString() ?? null });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 409;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
