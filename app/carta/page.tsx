import Image from 'next/image';
import { PublicPage } from '@/components/public-page';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({
  title: 'Carta',
  description: 'La carta mediterránea de La Bocana: producto, temporada y platos para compartir.',
  path: '/carta',
  image: '/images/paella-la-bocana.jpg',
});

const dishes = [
  {
    category: 'Para empezar',
    name: 'Croquetas de la casa',
    description: 'Doradas, cremosas y pensadas para abrir la mesa.',
    image: '/images/croquetas-la-bocana-real.jpeg',
    position: 'center 64%',
  },
  {
    category: 'Marisco',
    name: 'Gambas al ajillo',
    description: 'Producto mediterráneo servido al centro y sin artificios.',
    image: '/images/gambas-la-bocana.jpg',
    position: 'center',
  },
  {
    category: 'Fresco y ligero',
    name: 'Ensalada de marisco',
    description: 'Marisco, vegetales frescos y el Mediterráneo al fondo.',
    image: '/images/marisco-la-bocana-real.jpeg',
    position: 'center 62%',
  },
  {
    category: 'Del mar',
    name: 'Pescado del día',
    description: 'Preparado a la plancha para respetar el sabor del producto.',
    image: '/images/pescado-la-bocana-real.jpeg',
    position: 'center 68%',
  },
  {
    category: 'La casa',
    name: 'Pescado mediterráneo',
    description: 'Una forma directa de disfrutar el mar desde la mesa.',
    image: '/images/pescado-mediterraneo-la-bocana.jpeg',
    position: 'center 68%',
  },
  {
    category: 'Para compartir',
    name: 'Arroces y paellas',
    description: 'Sabores reconocibles, fondo mediterráneo y mesa larga.',
    image: '/images/paella-la-bocana.jpg',
    position: 'center',
  },
];

export default function CartaPage() {
  return (
    <PublicPage
      eyebrow="Un recorrido por el sabor"
      title="Inspirada en el Mediterráneo."
      intro="Producto, tradición y platos pensados para compartir frente al mar."
      image="/images/paella-la-bocana.jpg"
    >
      <div className="visual-menu-intro">
        <span>Selección de La Bocana</span>
        <h2>Primero se come con los ojos.</h2>
        <p>Cada propuesta se presenta con una imagen real para que la carta sea más clara, apetecible y fácil de explorar tanto en móvil como en mesa.</p>
      </div>
      <div className="visual-menu-grid">
        {dishes.map((dish, index) => (
          <article className="visual-menu-card" key={dish.name}>
            <div className="visual-menu-image">
              <Image
                src={dish.image}
                alt={dish.name}
                fill
                sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                style={{ objectPosition: dish.position }}
              />
              <span className="visual-menu-rail">{dish.name}</span>
              <span className="visual-menu-number">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="visual-menu-copy">
              <span>{dish.category}</span>
              <h3>{dish.name}</h3>
              <p>{dish.description}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="menu-note">Selección visual de presentación. La carta completa, los precios, los alérgenos y la disponibilidad se publicarán únicamente con la información definitiva validada por La Bocana.</p>
    </PublicPage>
  );
}
