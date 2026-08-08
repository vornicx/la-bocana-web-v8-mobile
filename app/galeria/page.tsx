import Image from 'next/image';
import { PublicPage } from '@/components/public-page';
export const metadata = { title: 'Galería', description: 'La terraza, el producto y las sobremesas de La Bocana junto al mar.' };
const imgs=['/images/photo-1.jpg','/images/sobremesa-la-bocana-real.jpeg','/images/mesa-frente-al-mar.jpg','/images/pescado-la-bocana-real.jpeg','/images/marisco-la-bocana-real.jpeg','/images/croquetas-la-bocana-real.jpeg'];
export default function GaleriaPage(){return <PublicPage eyebrow="Galería" title="La Bocana, a su ritmo." intro="Mesas abiertas al agua, producto, sobremesas y esa luz que hace reconocible el puerto." image="/images/photo-2.jpg"><div className="gallery-wall">{imgs.map((src,i)=><div className={i===1||i===4?'wide':''} key={src}><Image src={src} alt="La Bocana" fill sizes="(max-width: 700px) 100vw, 50vw" /></div>)}</div></PublicPage>}
