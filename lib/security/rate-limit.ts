import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type RateStore = Map<string, number[]>;
type GlobalWithRateStore = typeof globalThis & { __laBocanaRateStore?: RateStore };

function localRateLimit(keyHash: string, action: string, limit: number, windowSeconds: number) {
  const globalStore = globalThis as GlobalWithRateStore;
  const store = globalStore.__laBocanaRateStore ??= new Map<string, number[]>();
  const key = `${action}:${keyHash}`;
  const now = Date.now();
  const threshold = now - windowSeconds * 1000;
  const recent = (store.get(key) ?? []).filter((stamp) => stamp >= threshold);
  if (recent.length >= limit) return false;
  recent.push(now);
  store.set(key, recent);
  return true;
}

function isMissingRateLimitRpc(error: { code?: string; message?: string }) {
  const message = (error.message ?? '').toLowerCase();
  return error.code === 'PGRST202' || (message.includes('could not find the function') && message.includes('consume_rate_limit'));
}

export async function enforceRateLimit(keyHash: string, action: string, limit: number, windowSeconds: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('consume_rate_limit', {
    p_key_hash: keyHash,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  let allowed: boolean;
  if (error) {
    if (!isMissingRateLimitRpc(error)) {
      console.error('[La Bocana] Fallo al validar el rate limit', error.message);
      const serviceError = new Error('El servicio está temporalmente ocupado. Inténtalo de nuevo en unos minutos.');
      (serviceError as Error & { status?: number }).status = 503;
      throw serviceError;
    }
    // Compatibilidad temporal para preview/Vercel mientras se aplica la migración SQL.
    // No sustituye al rate limit transaccional de PostgreSQL para producción multi-instancia.
    console.warn('[La Bocana] consume_rate_limit no existe en Supabase; usando fallback local temporal.');
    allowed = localRateLimit(keyHash, action, limit, windowSeconds);
  } else {
    allowed = data === true;
  }

  if (!allowed) {
    const rateError = new Error('Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.');
    (rateError as Error & { status?: number }).status = 429;
    throw rateError;
  }
}
