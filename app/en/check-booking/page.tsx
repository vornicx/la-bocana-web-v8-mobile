import { LookupPageContent } from '@/app/consultar-reserva/page';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Check booking', robots: { index: false, follow: false, noarchive: true } };

export default function CheckBookingPage() { return <LookupPageContent locale="en" />; }
