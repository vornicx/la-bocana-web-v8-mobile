'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ManagedMenuCategory, ManagedMenuItem } from '@/lib/admin/types';

function blankItem(categoryId: string, sortOrder: number): ManagedMenuItem {
  return { id: `draft-${crypto.randomUUID()}`, categoryId, nameEs: '', nameEn: null, priceLabel: '', noteEs: null, noteEn: null, imagePath: null, imageAltEs: null, imageAltEn: null, sortOrder, active: true };
}

async function responseJson(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? 'No se pudo completar la operación.');
  return payload;
}

export function MenuManagerClient({ initialCategories, canEdit }: { initialCategories: ManagedMenuCategory[]; canEdit: boolean }) {
  const [categories, setCategories] = useState(initialCategories);
  const [type, setType] = useState<'food' | 'wine'>('food');
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visible = categories.filter((category) => category.menuType === type);
  const itemCount = visible.reduce((sum, category) => sum + category.items.length, 0);
  const photos = visible.reduce((sum, category) => sum + category.items.filter((item) => item.imagePath).length, 0);

  function updateCategory(id: string, patch: Partial<ManagedMenuCategory>) {
    setCategories((current) => current.map((category) => category.id === id ? { ...category, ...patch } : category));
  }
  function updateItem(categoryId: string, itemId: string, patch: Partial<ManagedMenuItem>) {
    setCategories((current) => current.map((category) => category.id === categoryId ? { ...category, items: category.items.map((item) => item.id === itemId ? { ...item, ...patch } : item) } : category));
  }
  function addItem(category: ManagedMenuCategory) {
    updateCategory(category.id, { items: [...category.items, blankItem(category.id, category.items.length + 1)] });
  }

  async function save(entity: 'category' | 'item', value: ManagedMenuCategory | ManagedMenuItem, success = 'Carta actualizada. El cambio ya alimenta la web pública.') {
    setBusy(value.id); setMessage(null);
    try {
      const isNew = entity === 'item' && value.id.startsWith('draft-');
      const response = await fetch('/api/admin/menu', { method: isNew ? 'POST' : 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entity, value }) });
      const payload = await responseJson(response);
      if (isNew) updateItem((value as ManagedMenuItem).categoryId, value.id, { id: payload.id });
      setMessage(success);
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    } finally { setBusy(null); }
  }

  async function uploadPhoto(categoryId: string, item: ManagedMenuItem, file: File | null) {
    if (!file) return;
    setUploading(item.id); setMessage(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const payload = await responseJson(await fetch('/api/admin/menu/media', { method: 'POST', body: form }));
      const next: ManagedMenuItem = {
        ...item,
        imagePath: String(payload.path),
        imageAltEs: item.imageAltEs || item.nameEs || null,
        imageAltEn: item.imageAltEn || item.nameEn || null,
      };
      updateItem(categoryId, item.id, { imagePath: next.imagePath, imageAltEs: next.imageAltEs, imageAltEn: next.imageAltEn });
      if (item.id.startsWith('draft-')) setMessage('Fotografía subida. Completa la referencia y guárdala para publicarla.');
      else await save('item', next, 'Fotografía subida y publicada en la carta.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setUploading(null); }
  }

  async function removePhoto(categoryId: string, item: ManagedMenuItem) {
    if (!item.imagePath) return;
    setUploading(item.id); setMessage(null);
    try {
      if (item.imagePath.startsWith('/api/menu-media/')) {
        await responseJson(await fetch('/api/admin/menu/media', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ path: item.imagePath }) }));
      }
      const next: ManagedMenuItem = { ...item, imagePath: null, imageAltEs: null, imageAltEn: null };
      updateItem(categoryId, item.id, { imagePath: null, imageAltEs: null, imageAltEn: null });
      if (item.id.startsWith('draft-')) setMessage('Fotografía retirada del borrador.');
      else await save('item', next, 'Fotografía retirada de la carta pública.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setUploading(null); }
  }

  return <div className="admin-page menu-manager-page">
    <div className="admin-page-head"><div><span className="admin-kicker">Carta gestionable · fuente única</span><h1>Carta</h1><p>Publica categorías, precios, disponibilidad, textos bilingües y fotografía oficial sin tocar código.</p></div>{!canEdit && <span className="pending-tag">Solo lectura</span>}</div>
    <div className="menu-manager-command"><div className="segmented"><button className={type === 'food' ? 'active' : ''} onClick={() => setType('food')}>Carta</button><button className={type === 'wine' ? 'active' : ''} onClick={() => setType('wine')}>Vinos</button></div><div><span>{visible.length} categorías</span><span>{itemCount} referencias</span><span className={photos < itemCount ? 'attention' : ''}>{photos} con fotografía oficial</span></div></div>
    {message && <div className="admin-feedback" role="status">{message}</div>}
    <div className="menu-manager-list">{visible.map((category, index) => <details className="menu-manager-category" key={category.id} open={index === 0}><summary><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{category.nameEs}</strong><small>{category.items.length} referencias · {category.items.filter((item) => item.active).length} publicadas</small></div><i className={category.active ? 'published' : ''}>{category.active ? 'Publicada' : 'Oculta'}</i></summary><div className="menu-category-editor"><div className="menu-category-fields"><label><span>Nombre ES</span><input disabled={!canEdit} value={category.nameEs} onChange={(event) => updateCategory(category.id, { nameEs: event.target.value })}/></label><label><span>Nombre EN</span><input disabled={!canEdit} value={category.nameEn ?? ''} onChange={(event) => updateCategory(category.id, { nameEn: event.target.value || null })}/></label><label><span>Descriptor ES</span><input disabled={!canEdit} value={category.eyebrowEs ?? ''} onChange={(event) => updateCategory(category.id, { eyebrowEs: event.target.value || null })}/></label><label><span>Descriptor EN</span><input disabled={!canEdit} value={category.eyebrowEn ?? ''} onChange={(event) => updateCategory(category.id, { eyebrowEn: event.target.value || null })}/></label><label className="toggle-label"><input type="checkbox" disabled={!canEdit} checked={category.active} onChange={(event) => updateCategory(category.id, { active: event.target.checked })}/><span>Publicar categoría</span></label><button className="admin-secondary" disabled={!canEdit || busy === category.id} onClick={() => save('category', category)}>Guardar categoría</button></div>
      <div className="menu-items-editor"><div className="menu-items-head"><span>Referencias</span><button disabled={!canEdit} onClick={() => addItem(category)}>Nueva referencia</button></div>{category.items.map((item) => <article className={!item.active ? 'inactive' : ''} key={item.id}><div className="menu-item-primary"><label><span>Nombre ES</span><input disabled={!canEdit} value={item.nameEs} onChange={(event) => updateItem(category.id, item.id, { nameEs: event.target.value })}/></label><label><span>Nombre EN</span><input disabled={!canEdit} value={item.nameEn ?? ''} onChange={(event) => updateItem(category.id, item.id, { nameEn: event.target.value || null })}/></label><label className="price-field"><span>Precio</span><input disabled={!canEdit} value={item.priceLabel} onChange={(event) => updateItem(category.id, item.id, { priceLabel: event.target.value })}/></label><label className="switch"><input type="checkbox" disabled={!canEdit} checked={item.active} onChange={(event) => updateItem(category.id, item.id, { active: event.target.checked })}/><span/></label><button className="admin-primary" disabled={!canEdit || busy === item.id || uploading === item.id} onClick={() => save('item', item)}>Guardar</button></div>
        <div className="menu-item-secondary"><label><span>Detalle ES</span><input disabled={!canEdit} value={item.noteEs ?? ''} onChange={(event) => updateItem(category.id, item.id, { noteEs: event.target.value || null })}/></label><label><span>Detalle EN</span><input disabled={!canEdit} value={item.noteEn ?? ''} onChange={(event) => updateItem(category.id, item.id, { noteEn: event.target.value || null })}/></label></div>
        <div className={`menu-media-manager ${item.imagePath ? 'has-media' : 'missing-media'}`}>
          <div className="menu-media-preview">{item.imagePath ? <Image src={item.imagePath} alt={item.imageAltEs || item.nameEs || 'Fotografía de carta'} fill sizes="120px" unoptimized /> : <div><span>Sin fotografía</span><small>JPG · PNG · WebP · AVIF</small></div>}</div>
          <div className="menu-media-copy"><span>Fotografía oficial</span><strong>{item.imagePath ? 'Imagen publicada' : 'Añadir imagen del plato'}</strong><p>{item.imagePath ? 'Se sirve desde la biblioteca gestionada de La Bocana.' : 'Sube material real del restaurante. Máximo 8 MB.'}</p><div className="menu-media-actions"><label className={`menu-upload-button ${!canEdit ? 'disabled' : ''}`}><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!canEdit || uploading === item.id} onChange={(event) => { const file = event.currentTarget.files?.[0] ?? null; void uploadPhoto(category.id, item, file); event.currentTarget.value = ''; }}/>{uploading === item.id ? 'Procesando…' : item.imagePath ? 'Sustituir foto' : 'Subir fotografía'}</label>{item.imagePath && <button type="button" disabled={!canEdit || uploading === item.id} onClick={() => void removePhoto(category.id, item)}>Retirar</button>}</div></div>
          {item.imagePath && <div className="menu-media-alt"><label><span>Texto alternativo ES</span><input disabled={!canEdit} value={item.imageAltEs ?? ''} onChange={(event) => updateItem(category.id, item.id, { imageAltEs: event.target.value || null })}/></label><label><span>Texto alternativo EN</span><input disabled={!canEdit} value={item.imageAltEn ?? ''} onChange={(event) => updateItem(category.id, item.id, { imageAltEn: event.target.value || null })}/></label></div>}
        </div>
      </article>)}</div></div></details>)}</div>
    <div className="reservation-footnote"><span><i/> Publicación controlada</span><p>Ocultar una referencia la retira de la web sin borrar su historial. Las fotografías subidas desde Control quedan en almacenamiento privado y solo se sirven cuando forman parte de la carta publicada.</p></div>
  </div>;
}
