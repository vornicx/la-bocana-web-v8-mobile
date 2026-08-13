import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function optionalText(value: unknown, max: number) {
  const text = String(value ?? '').trim();
  if (text.length > max) throw new Error('Uno de los campos supera la longitud permitida.');
  return text || null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await requireStaffSession(['manager', 'host']);
    const { id } = await params;
    if (!id) throw new Error('Cliente inválido.');
    const body = await request.json();
    const patch = {
      allergies: optionalText(body.allergies, 1000),
      preferences: optionalText(body.preferences, 1000),
      internal_notes: optionalText(body.internalNotes, 2000),
      updated_at: new Date().toISOString(),
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase.from('customers').update(patch).eq('id', id).select('id').maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'El cliente ya no existe.' }, { status: 404 });

    await supabase.from('activity_logs').insert({
      actor_type: 'staff', actor_user_id: staff.id, action: 'customer_memory_updated',
      entity_type: 'customer', entity_id: id,
      metadata: { allergies_set: Boolean(patch.allergies), preferences_set: Boolean(patch.preferences), internal_notes_set: Boolean(patch.internal_notes) },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
