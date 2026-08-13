import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params;
    if (!path?.length || path.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
      return new NextResponse('Not found', { status: 404 });
    }
    const objectPath = path.join('/');
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage.from('menu-media').download(objectPath);
    if (error || !data) return new NextResponse('Not found', { status: 404 });

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
