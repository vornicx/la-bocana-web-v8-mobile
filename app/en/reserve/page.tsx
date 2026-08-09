import { ReservationPageContent } from '@/app/reservar/page';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ title: 'Book a table', description: 'Book your table at La Bocana with availability confirmed in real time.', path: '/en/reserve', alternatePath: '/reservar', locale: 'en', image: '/images/gallery-official/mesa-vista.webp' });

export default function ReservePage() {
  return <ReservationPageContent locale="en" />;
}
