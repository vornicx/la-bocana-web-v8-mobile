import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 8 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export async function POST(request: Request) {
  try {
    const staff = await requireStaffSession(['manager', 'editor']);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Selecciona una imagen válida.');
    if (!extensions[file.type]) throw new Error('Formato no admitido. Usa JPG, PNG, WebP o AVIF.');
    if (file.size <= 0 || file.size > MAX_BYTES) throw new Error('La imagen debe pesar menos de 8 MB.');

    const now = new Date();
    const objectPath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${extensions[file.type]}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from('menu-media').upload(objectPath, bytes, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw new Error(`No se pudo subir la fotografía: ${error.message}`);

    await supabase.from('activity_logs').insert({
      actor_type: 'staff',
      actor_user_id: staff.id,
      action: 'menu_media_uploaded',
      entity_type: 'menu_media',
      metadata: { object_path: objectPath, mime_type: file.type, size: file.size },
    });

    const publicPath = `/api/menu-media/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
    return NextResponse.json({ ok: true, path: publicPath }, { status: 201 });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 400;
    return NextResponse.json({ error: (error as Error).message }, { status });
  }
}
