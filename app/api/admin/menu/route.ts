import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

function text(value: unknown, max: number, required = false) {
  const parsed = String(value ?? '').trim().slice(0, max);
  if (required && !parsed) throw new Error('Completa los campos obligatorios.');
  return parsed || null;
}
function order(value: unknown) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 && parsed <= 10_000 ? parsed : 0; }
function imagePath(value: unknown) { const parsed = text(value, 500); if (parsed && !parsed.startsWith('/images/')) throw new Error('La fotografía debe pertenecer a la biblioteca oficial de la web.'); return parsed; }

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'editor']);
    const { entity, value = {} } = await request.json();
    const id = String(value.id ?? '');
    if (!id) throw new Error('Elemento de carta inválido.');
    const supabase = createAdminClient();
    let patch: Record<string, unknown>;
    if (entity === 'category') patch = { name_es: text(value.nameEs, 160, true), name_en: text(value.nameEn, 160), eyebrow_es: text(value.eyebrowEs, 240), eyebrow_en: text(value.eyebrowEn, 240), intro_es: text(value.introEs, 1000), intro_en: text(value.introEn, 1000), sort_order: order(value.sortOrder), active: Boolean(value.active) };
    else if (entity === 'item') patch = { name_es: text(value.nameEs, 200, true), name_en: text(value.nameEn, 200), price_label: text(value.priceLabel, 80, true), note_es: text(value.noteEs, 500), note_en: text(value.noteEn, 500), image_path: imagePath(value.imagePath), image_alt_es: text(value.imageAltEs, 300), image_alt_en: text(value.imageAltEn, 300), sort_order: order(value.sortOrder), active: Boolean(value.active) };
    else throw new Error('Tipo de elemento inválido.');
    const table = entity === 'category' ? 'menu_categories' : 'menu_items';
    const { error } = await supabase.from(table).update(patch).eq('id', id);
    if (error) throw new Error(error.message);
    await supabase.from('activity_logs').insert({ actor_type: 'staff', actor_user_id: staff.id, action: 'menu_updated', entity_type: entity, entity_id: id, metadata: patch });
    return NextResponse.json({ ok: true });
  } catch (error) { const status = (error as Error & { status?: number }).status ?? 409; return NextResponse.json({ error: (error as Error).message }, { status }); }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'editor']);
    const { entity, value = {} } = await request.json();
    if (entity !== 'item') throw new Error('Solo se pueden crear referencias desde esta vista.');
    const patch = { category_id: String(value.categoryId ?? ''), name_es: text(value.nameEs, 200, true), name_en: text(value.nameEn, 200), price_label: text(value.priceLabel, 80, true), note_es: text(value.noteEs, 500), note_en: text(value.noteEn, 500), image_path: imagePath(value.imagePath), image_alt_es: text(value.imageAltEs, 300), image_alt_en: text(value.imageAltEn, 300), sort_order: order(value.sortOrder), active: Boolean(value.active) };
    if (!patch.category_id) throw new Error('Categoría inválida.');
    const supabase = createAdminClient();
    const { data, error } = await supabase.from('menu_items').insert(patch).select('id').single();
    if (error) throw new Error(error.message);
    await supabase.from('activity_logs').insert({ actor_type: 'staff', actor_user_id: staff.id, action: 'menu_item_created', entity_type: 'item', entity_id: data.id, metadata: patch });
    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) { const status = (error as Error & { status?: number }).status ?? 409; return NextResponse.json({ error: (error as Error).message }, { status }); }
}
