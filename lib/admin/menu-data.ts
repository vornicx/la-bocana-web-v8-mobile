import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { ManagedMenuCategory, ManagedMenuItem } from './types';

export async function loadManagedMenu(): Promise<ManagedMenuCategory[]> {
  const supabase = createAdminClient();
  const [categoriesResult, itemsResult] = await Promise.all([
    supabase.from('menu_categories').select('id, menu_type, slug, name_es, name_en, eyebrow_es, eyebrow_en, intro_es, intro_en, sort_order, active').order('menu_type').order('sort_order'),
    supabase.from('menu_items').select('id, category_id, name_es, name_en, price_label, note_es, note_en, image_path, image_alt_es, image_alt_en, sort_order, active').order('sort_order'),
  ]);
  if (categoriesResult.error) throw new Error(`No se pudo cargar la carta: ${categoriesResult.error.message}`);
  if (itemsResult.error) throw new Error(`No se pudieron cargar los productos: ${itemsResult.error.message}`);
  const items = (itemsResult.data ?? []).map((item): ManagedMenuItem => ({
    id: String(item.id), categoryId: String(item.category_id), nameEs: String(item.name_es), nameEn: item.name_en ? String(item.name_en) : null,
    priceLabel: String(item.price_label), noteEs: item.note_es ? String(item.note_es) : null, noteEn: item.note_en ? String(item.note_en) : null,
    imagePath: item.image_path ? String(item.image_path) : null, imageAltEs: item.image_alt_es ? String(item.image_alt_es) : null,
    imageAltEn: item.image_alt_en ? String(item.image_alt_en) : null, sortOrder: Number(item.sort_order), active: Boolean(item.active),
  }));
  return (categoriesResult.data ?? []).map((category): ManagedMenuCategory => ({
    id: String(category.id), menuType: category.menu_type as 'food' | 'wine', slug: String(category.slug), nameEs: String(category.name_es),
    nameEn: category.name_en ? String(category.name_en) : null, eyebrowEs: category.eyebrow_es ? String(category.eyebrow_es) : null,
    eyebrowEn: category.eyebrow_en ? String(category.eyebrow_en) : null, introEs: category.intro_es ? String(category.intro_es) : null,
    introEn: category.intro_en ? String(category.intro_en) : null, sortOrder: Number(category.sort_order), active: Boolean(category.active),
    items: items.filter((item) => item.categoryId === String(category.id)),
  }));
}
