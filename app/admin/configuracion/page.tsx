import { requireStaffSession } from '@/lib/admin/auth';
import { loadSettingsData } from '@/lib/admin/overview-data';
import { SettingsPageClient } from './settings-page-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const staff = await requireStaffSession();
  const settings = await loadSettingsData();
  return <SettingsPageClient initialSettings={settings} canEdit={staff.role === 'manager'} />;
}
