'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type LoginState = {
  status: 'idle' | 'error';
  message: string | null;
  email: string;
};

export async function loginStaff(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { status: 'error', message: 'Introduce tu email y contraseña para continuar.', email };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { status: 'error', message: 'Email o contraseña incorrectos. Comprueba los datos e inténtalo de nuevo.', email };
  }

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const id = claimsData?.claims?.sub ? String(claimsData.claims.sub) : null;
  if (claimsError || !id) {
    await supabase.auth.signOut();
    return { status: 'error', message: 'No se ha podido validar la sesión. Inténtalo de nuevo.', email };
  }

  const { data: staff, error: staffError } = await supabase.from('users').select('active').eq('id', id).maybeSingle();
  if (staffError || !staff?.active) {
    await supabase.auth.signOut();
    return { status: 'error', message: 'Esta cuenta no tiene acceso activo a La Bocana Control.', email };
  }

  redirect('/control');
}
