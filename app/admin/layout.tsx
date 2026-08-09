import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getStaffSession } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Operaciones', robots: { index: false, follow: false, noarchive: true } };

export default async function AdminLayout({children}:{children:ReactNode}){
  const staff = await getStaffSession();
  if (!staff) redirect('/admin-login');
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
