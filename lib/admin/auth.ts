import 'server-only';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { StaffSession } from './types';

export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createServerSupabaseClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (claimsError || !claims?.sub) return null;

  const { data: staff, error } = await supabase
    .from('users')
    .select('id, full_name, role, active')
    .eq('id', String(claims.sub))
    .maybeSingle();

  if (error || !staff || staff.active !== true) return null;

  return {
    id: String(staff.id),
    email: typeof claims.email === 'string' ? claims.email : '',
    fullName: String(staff.full_name),
    role: staff.role as StaffSession['role'],
  };
}

export async function requireStaffSession(roles?: StaffSession['role'][]): Promise<StaffSession> {
  const staff = await getStaffSession();
  if (!staff) {
    const error = new Error('No autorizado.') as Error & { status?: number };
    error.status = 401;
    throw error;
  }
  if (roles && !roles.includes(staff.role)) {
    const error = new Error('No tienes permisos para realizar esta acción.') as Error & { status?: number };
    error.status = 403;
    throw error;
  }
  return staff;
}
