import Image from 'next/image';
import { PublicPage } from '@/components/public-page';
const imgs=['/images/photo-1.jpg','/images/photo-5.jpg','/images/paella-la-bocana.jpg','/images/mesa-marisco-la-bocana.jpg','/images/photo-6.jpg','/images/gambas-la-bocana.jpg'];
export default function GaleriaPage(){return <PublicPage eyebrow="Galería" title="La Bocana, a su ritmo." intro="Mesas abiertas al agua, producto, sobremesas y esa luz que hace reconocible el puerto." image="/images/photo-2.jpg"><div className="gallery-wall">{imgs.map((src,i)=><div className={i===1||i===4?'wide':''} key={src}><Image src={src} alt="La Bocana" fill sizes="(max-width: 700px) 100vw, 50vw" /></div>)}</div></PublicPage>}
