import { NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    if (!path?.length || path.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
      return new NextResponse('Not found', { status: 404 });
    }

    const objectPath = path.join('/');
    const publicPath = `/api/menu-media/${path.map(encodeURIComponent).join('/')}`;
    const supabase = createAdminClient();
    const { data: item, error: itemError } = await supabase.from('menu_items')
      .select('category_id, active')
      .eq('image_path', publicPath)
      .maybeSingle();
    if (itemError) return new NextResponse('Not found', { status: 404 });

    let published = false;
    if (item?.active) {
      const { data: category, error: categoryError } = await supabase.from('menu_categories')
        .select('active')
        .eq('id', item.category_id)
        .maybeSingle();
      published = !categoryError && category?.active === true;
    }

    if (!published) {
      const staff = await getStaffSession();
      if (!staff) return new NextResponse('Not found', { status: 404 });
    }

    const { data, error } = await supabase.storage.from('menu-media').download(objectPath);
    if (error || !data) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': published ? 'public, max-age=31536000, immutable' : 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
