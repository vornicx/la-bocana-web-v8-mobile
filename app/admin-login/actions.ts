'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function loginStaff(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) redirect('/admin-login?error=missing');

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect('/admin-login?error=credentials');

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;
  if (claimsError || !id) {
    await supabase.auth.signOut();
    redirect('/admin-login?error=session');
  }

  const { data: staff } = await supabase.from('users').select('active').eq('id', id).maybeSingle();
  if (!staff?.active) {
    await supabase.auth.signOut();
    redirect('/admin-login?error=access');
  }

  redirect('/control/sala');
}
