import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/env';

export function createPublicServerClient() {
  const env = publicEnv();
  return createClient(env.supabaseUrl, env.supabasePublicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'X-Client-Info': 'la-bocana-public-menu' } },
  });
}
