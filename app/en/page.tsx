import { HomeExperience } from '@/components/home-experience';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ title: 'Mediterranean restaurant in Puerto Banús', description: 'Mediterranean cuisine, honest produce and long lunches by the sea in Puerto Banús.', path: '/en', alternatePath: '/', locale: 'en' });

export default function EnglishHomePage() {
  return <HomeExperience locale="en" />;
}
