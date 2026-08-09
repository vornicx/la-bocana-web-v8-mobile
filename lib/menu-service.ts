import 'server-only';

import { createPublicServerClient } from '@/lib/supabase/public';
import { foodMenu, wineMenu, type MenuCategory } from '@/lib/menu-data';
import type { PublicLocale } from '@/lib/i18n';

type CategoryRow = { id: string; slug: string; name_es: string; name_en: string | null; eyebrow_es: string | null; eyebrow_en: string | null; intro_es: string | null; intro_en: string | null; sort_order: number };
type ItemRow = { category_id: string; name_es: string; name_en: string | null; price_label: string; note_es: string | null; note_en: string | null; image_path: string | null; image_alt_es: string | null; image_alt_en: string | null; sort_order: number };

export async function loadPublicMenu(type: 'food' | 'wine', locale: PublicLocale): Promise<MenuCategory[]> {
  const fallback = type === 'food' ? foodMenu : wineMenu;
  try {
    const supabase = createPublicServerClient();
    const categoriesResult = await supabase.from('menu_categories').select('id, slug, name_es, name_en, eyebrow_es, eyebrow_en, intro_es, intro_en, sort_order').eq('menu_type', type).eq('active', true).order('sort_order');
    if (categoriesResult.error) return fallback;
    const categories = (categoriesResult.data ?? []) as CategoryRow[];
    if (!categories.length) return [];
    const itemsResult = await supabase.from('menu_items').select('category_id, name_es, name_en, price_label, note_es, note_en, image_path, image_alt_es, image_alt_en, sort_order').in('category_id', categories.map((category) => category.id)).eq('active', true).order('sort_order');
    if (itemsResult.error) return fallback;
    const items = (itemsResult.data ?? []) as ItemRow[];
    return categories.map((category) => ({
      id: category.slug,
      name: locale === 'en' ? (category.name_en || category.name_es) : category.name_es,
      eyebrow: locale === 'en' ? (category.eyebrow_en || category.eyebrow_es || '') : (category.eyebrow_es || ''),
      intro: locale === 'en' ? (category.intro_en || category.intro_es || undefined) : (category.intro_es || undefined),
      items: items.filter((item) => item.category_id === category.id).map((item) => ({
        name: locale === 'en' ? (item.name_en || item.name_es) : item.name_es,
        price: item.price_label,
        note: locale === 'en' ? (item.note_en || item.note_es || undefined) : (item.note_es || undefined),
        image: item.image_path || undefined,
        imageAlt: locale === 'en' ? (item.image_alt_en || item.image_alt_es || item.name_en || item.name_es) : (item.image_alt_es || item.name_es),
      })),
    }));
  } catch {
    return fallback;
  }
}
