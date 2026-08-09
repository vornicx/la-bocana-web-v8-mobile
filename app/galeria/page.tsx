import { PublicPage } from '@/components/public-page';
import { createPublicMetadata } from '@/lib/site';
import { GalleryExperience } from '@/components/gallery-experience';

export const metadata = createPublicMetadata({
  title: 'Galería',
  description: 'La terraza, la cocina, el servicio y las vistas al Mediterráneo de La Bocana en Puerto Banús.',
  path: '/galeria',
  alternatePath: '/en/gallery',
  image: '/images/gallery-official/faro.webp',
});

const images = [
  { src: '/images/gallery-official/exterior.webp', alt: 'Exterior blanco de La Bocana en Puerto Banús', shape: 'wide' },
  { src: '/images/sobremesa-la-bocana-real.jpeg', alt: 'Clientes disfrutando de una sobremesa frente al mar', shape: 'tall' },
  { src: '/images/gallery-official/interior.webp', alt: 'Interior luminoso y barra de La Bocana', shape: 'standard' },
  { src: '/images/gallery-official/faro.webp', alt: 'Terraza de La Bocana con el faro de Puerto Banús al fondo', shape: 'tall' },
  { src: '/images/pescado-la-bocana-real.jpeg', alt: 'Pescado servido en la terraza de La Bocana', shape: 'standard' },
  { src: '/images/gallery-official/brocheta-servicio.webp', alt: 'Presentación de una brocheta frente al Mediterráneo', shape: 'wide' },
  { src: '/images/gallery-official/pulpo-terraza.webp', alt: 'Pulpo servido en la terraza junto a una copa de vino', shape: 'standard' },
  { src: '/images/gallery-official/ambiente.webp', alt: 'Ambiente de la terraza de La Bocana', shape: 'tall' },
  { src: '/images/gallery-official/marisco-mediterraneo.webp', alt: 'Plato de marisco con el mar y el faro al fondo', shape: 'standard' },
  { src: '/images/gallery-official/brocheta.webp', alt: 'Brocheta presentada frente al mar', shape: 'tall' },
  { src: '/images/gallery-official/calamares.webp', alt: 'Calamares fritos de La Bocana', shape: 'standard' },
  { src: '/images/gallery-official/pasta.webp', alt: 'Plato de pasta servido junto al Mediterráneo', shape: 'wide' },
  { src: '/images/gallery-official/mesa-vista.webp', alt: 'Mesa preparada con vistas al puerto', shape: 'standard' },
  { src: '/images/gallery-official/mesa-atardecer.webp', alt: 'Terraza de La Bocana preparada para el atardecer', shape: 'tall' },
];

export default function GaleriaPage() {
  return (
    <PublicPage
      eyebrow="Galería oficial"
      title="Una mesa abierta al mar."
      intro="La terraza, el servicio, el producto y esa luz que hace reconocible a La Bocana."
      image="/images/gallery-official/faro.webp"
      mobileImage="/images/curated/faro-mobile.webp"
      imageAlt="Barca de La Bocana frente al faro de Puerto Banús"
    >
      <div className="gallery-curation-head">
        <span>Puerto Banús · Marbella</span>
        <h2>El restaurante, tal como se vive.</h2>
        <p>Una selección de imágenes reales de la casa: desde la primera mesa preparada hasta la última sobremesa frente al Mediterráneo.</p>
      </div>
      <GalleryExperience images={images} />
      <p className="gallery-source-note">Selección de la galería oficial y del material fotográfico de La Bocana. <a href="https://www.restaurantelabocana.es/galeria/" target="_blank" rel="noreferrer">Ver galería original</a>.</p>
    </PublicPage>
  );
}
