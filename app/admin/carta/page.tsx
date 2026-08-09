import { requireStaffSession } from '@/lib/admin/auth';
import { loadManagedMenu } from '@/lib/admin/menu-data';
import { MenuManagerClient } from './menu-manager-client';

export const dynamic = 'force-dynamic';

export default async function MenuManagerPage() {
  const staff = await requireStaffSession();
  const categories = await loadManagedMenu();
  return <MenuManagerClient initialCategories={categories} canEdit={['manager', 'editor'].includes(staff.role)} />;
}
