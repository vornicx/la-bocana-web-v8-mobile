import Image from 'next/image';
import { PublicPage } from '@/components/public-page';
import { createPublicMetadata } from '@/lib/site';
export const metadata = createPublicMetadata({ title: 'Galería', description: 'La terraza, el producto y las sobremesas de La Bocana junto al mar.', path: '/galeria', image: '/images/sobremesa-la-bocana-real.jpeg' });
const images=[
  {src:'/images/sobremesa-la-bocana-real.jpeg',alt:'Sobremesa frente al mar en La Bocana'},
  {src:'/images/pescado-mediterraneo-la-bocana.jpeg',alt:'Pescado servido junto al faro de Puerto Banús'},
  {src:'/images/pescado-la-bocana-real.jpeg',alt:'Pescado a la plancha servido en La Bocana'},
  {src:'/images/marisco-la-bocana-real.jpeg',alt:'Ensalada de marisco con el Mediterráneo al fondo'},
  {src:'/images/croquetas-la-bocana-real.jpeg',alt:'Croquetas de la casa servidas en la terraza'},
  {src:'/images/gambas-la-bocana.jpg',alt:'Gambas servidas para compartir en La Bocana'},
];
export default function GaleriaPage(){return <PublicPage eyebrow="Galería" title="La Bocana, a su ritmo." intro="Mesas abiertas al agua, producto, sobremesas y esa luz que hace reconocible el puerto." image="/images/sobremesa-la-bocana-real.jpeg"><div className="gallery-wall">{images.map((image,i)=><div className={i===1||i===4?'wide':''} key={image.src}><Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 100vw, 50vw" /></div>)}</div></PublicPage>}
