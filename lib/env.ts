const FALLBACK_SUPABASE_URL = 'https://rjaeqcrtxzonxqhzfxtq.supabase.co';
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Ea6D9IkoYuDP7VZdooplag_rpLcpQWG';

export function publicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? FALLBACK_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return { supabaseUrl: url, supabasePublicKey: publicKey };
}

export function serverEnv() {
  const { supabaseUrl } = publicEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error('Falta la clave secreta de Supabase. Define SUPABASE_SECRET_KEY solo en servidor.');
  }
  return {
    supabaseUrl,
    supabaseSecretKey: secret,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    timezone: process.env.RESERVATION_TIMEZONE ?? 'Europe/Madrid',
  };
}
