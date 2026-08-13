import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { getStaffSession } from '@/lib/admin/auth';
import './control-premium.css';
import './control-content.css';
import './control-waitlist.css';
import './control-customers.css';
import './control-refinement.css';
import './control-polish.css';
import './control-fields.css';
import './control-settings-premium.css';
import './control-calendar-premium.css';
import './control-operations-premium.css';
import './control-native-guard.css';

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
