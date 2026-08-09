-- Geographic indications and weights are language-neutral, but are copied to the English fields
-- so the managed menu has no ambiguous translation gaps.
update public.menu_items item set note_en = item.note_es
from public.menu_categories category
where item.category_id = category.id
  and item.note_es is not null
  and item.note_en is null
  and (category.menu_type = 'wine' or item.note_es in ('250 g','300 g'));
