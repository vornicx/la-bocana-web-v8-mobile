import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getStaffSession } from '@/lib/admin/auth';
import './control-premium.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'La Bocana Control',
  description: 'Sistema privado de operaciones de La Bocana.',
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaffSession();
  if (!staff) redirect('/control/login');
  return <AdminShell staff={staff}>{children}</AdminShell>;
}
