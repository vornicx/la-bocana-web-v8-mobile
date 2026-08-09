import { MenuCatalog } from '@/components/menu-catalog';
import { PublicPage } from '@/components/public-page';
import { loadPublicMenu } from '@/lib/menu-service';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({
  title: 'Carta',
  description: 'Carta oficial de La Bocana: entrantes, ibéricos, especialidades, pastas, arroces, pescados, mariscos y carnes.',
  path: '/carta',
  alternatePath: '/en/menu',
  image: '/images/menu-official/paella-marisco.webp',
});

export default async function CartaPage() {
  const foodMenu = await loadPublicMenu('food', 'es');
  return (
    <PublicPage
      eyebrow="La carta"
      title="El Mediterráneo, plato a plato."
      intro="Producto reconocible, recetas de la casa y una cocina pensada para compartir frente al mar."
      image="/images/gallery-official/marisco-mediterraneo.webp"
      mobileImage="/images/curated/marisco-mobile.webp"
      imageAlt="Calamar a la plancha servido frente al Mediterráneo"
    >
      <MenuCatalog categories={foodMenu} current="food" />
      <aside className="menu-legal-note" aria-label="Información sobre carta y alérgenos">
        <span>Información importante</span>
        <p>Si tienes alguna alergia o intolerancia, comunícalo al equipo antes de pedir. La composición, la disponibilidad y el precio de los productos de mercado pueden variar; confirma la información con el restaurante.</p>
        <a href="https://www.restaurantelabocana.es/food/" target="_blank" rel="noreferrer">Consultar fuente oficial</a>
      </aside>
    </PublicPage>
  );
}
