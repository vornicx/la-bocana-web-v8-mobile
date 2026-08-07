import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export async function enforceRateLimit(keyHash: string, action: string, limit: number, windowSeconds: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key_hash: keyHash,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`No se pudo validar el rate limit: ${error.message}`);
  if (data !== true) {
    const error = new Error('Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.');
    (error as Error & { status?: number }).status = 429;
    throw error;
  }
}
