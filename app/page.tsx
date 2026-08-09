import { HomeExperience } from '@/components/home-experience';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ path: '/', alternatePath: '/en' });

export default function HomePage() {
  return <HomeExperience />;
}
