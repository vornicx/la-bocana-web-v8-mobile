import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const env = publicEnv();
  return createServerClient(env.supabaseUrl, env.supabasePublicKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Component: la renovación la hará Proxy cuando se active Auth. */ }
      },
    },
  });
}
