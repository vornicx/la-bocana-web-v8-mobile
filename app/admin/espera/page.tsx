import { requireStaffSession } from '@/lib/admin/auth';
import { loadWaitlistData } from '@/lib/admin/overview-data';
import { WaitlistPageClient } from './waitlist-page-client';

export const dynamic = 'force-dynamic';

export default async function WaitlistPage() {
  const staff = await requireStaffSession();
  const items = await loadWaitlistData();
  return <WaitlistPageClient initialItems={items} canOperate={['manager', 'host'].includes(staff.role)} />;
}
