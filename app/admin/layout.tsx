import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getStaffSession } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({children}:{children:ReactNode}){
  const staff = await getStaffSession();
  if (!staff) redirect('/admin-login');
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
