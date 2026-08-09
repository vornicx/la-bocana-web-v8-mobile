import { PublicPage } from '@/components/public-page';
import { GalleryExperience } from '@/components/gallery-experience';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ title: 'Gallery', description: 'La Bocana terrace, cuisine, service and Mediterranean views in Puerto Banús.', path: '/en/gallery', alternatePath: '/galeria', locale: 'en', image: '/images/gallery-official/faro.webp' });

const images = [
  { src: '/images/gallery-official/exterior.webp', alt: 'La Bocana white exterior in Puerto Banús', shape: 'wide' },
  { src: '/images/sobremesa-la-bocana-real.jpeg', alt: 'Guests lingering over lunch by the sea', shape: 'tall' },
  { src: '/images/gallery-official/interior.webp', alt: 'La Bocana bright dining room and bar', shape: 'standard' },
  { src: '/images/gallery-official/faro.webp', alt: 'La Bocana terrace with the Puerto Banús lighthouse beyond', shape: 'tall' },
  { src: '/images/pescado-la-bocana-real.jpeg', alt: 'Fish served on La Bocana terrace', shape: 'standard' },
  { src: '/images/gallery-official/brocheta-servicio.webp', alt: 'A skewer being presented by the Mediterranean', shape: 'wide' },
  { src: '/images/gallery-official/pulpo-terraza.webp', alt: 'Octopus served on the terrace with a glass of wine', shape: 'standard' },
  { src: '/images/gallery-official/ambiente.webp', alt: 'The atmosphere on La Bocana terrace', shape: 'tall' },
  { src: '/images/gallery-official/marisco-mediterraneo.webp', alt: 'Seafood with the sea and lighthouse beyond', shape: 'standard' },
  { src: '/images/gallery-official/brocheta.webp', alt: 'Skewer presented by the sea', shape: 'tall' },
  { src: '/images/gallery-official/calamares.webp', alt: 'La Bocana fried calamari', shape: 'standard' },
  { src: '/images/gallery-official/pasta.webp', alt: 'Pasta served beside the Mediterranean', shape: 'wide' },
  { src: '/images/gallery-official/mesa-vista.webp', alt: 'A table set overlooking the harbour', shape: 'standard' },
  { src: '/images/gallery-official/mesa-atardecer.webp', alt: 'La Bocana terrace ready for sunset', shape: 'tall' },
];

export default function GalleryPage(){return <PublicPage locale="en" eyebrow="Official gallery" title="A table open to the sea." intro="The terrace, the service, the produce and the light that makes La Bocana unmistakable." image="/images/gallery-official/faro.webp" mobileImage="/images/curated/faro-mobile.webp" imageAlt="La Bocana boat facing the Puerto Banús lighthouse"><div className="gallery-curation-head"><span>Puerto Banús · Marbella</span><h2>The restaurant as it is lived.</h2><p>A selection of real images from the house, from the first table set to the last long lunch by the Mediterranean.</p></div><GalleryExperience images={images} locale="en" /><p className="gallery-source-note">Selected from the official gallery and La Bocana photographic material. <a href="https://www.restaurantelabocana.es/galeria/" target="_blank" rel="noreferrer">View original gallery</a>.</p></PublicPage>}
