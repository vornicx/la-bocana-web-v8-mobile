import { PublicPage } from '@/components/public-page';
import Link from 'next/link';
import { createPublicMetadata } from '@/lib/site';
export const metadata = createPublicMetadata({ title: 'Contacto', description: 'Contacto, ubicación y reservas de La Bocana en Puerto Banús, Marbella.', path: '/contacto', image: '/images/sobremesa-la-bocana-real.jpeg' });
export default function ContactoPage(){return <PublicPage eyebrow="Puerto Banús · Marbella" title="Nos vemos junto al mar." intro="Complejo Benabola · Bloque 1 · Puerto Banús. Para reservas, utiliza nuestro sistema online o contacta directamente con el restaurante." image="/images/sobremesa-la-bocana-real.jpeg"><div className="contact-grid"><div><span>Reservas y restaurante</span><a href="tel:+34952781410">+34 952 781 410</a></div><div><span>Ubicación</span><p>Complejo Benabola · Bloque 1<br/>Puerto Banús · Marbella</p></div><div><span>Reservar online</span><Link href="/reservar">Abrir reservas</Link></div></div></PublicPage>}
