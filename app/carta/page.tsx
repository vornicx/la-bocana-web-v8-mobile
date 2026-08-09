import { MenuCatalog } from '@/components/menu-catalog';
import { PublicPage } from '@/components/public-page';
import { foodMenu } from '@/lib/menu-data';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({
  title: 'Carta',
  description: 'Carta oficial de La Bocana: entrantes, ibéricos, especialidades, pastas, arroces, pescados, mariscos y carnes.',
  path: '/carta',
  image: '/images/menu-official/paella-marisco.webp',
});

export default function CartaPage() {
  return (
    <PublicPage
      eyebrow="Carta · Cocina"
      title="El Mediterráneo, plato a plato."
      intro="Producto reconocible, recetas de la casa y una cocina pensada para compartir frente al mar."
      image="/images/menu-official/paella-marisco.webp"
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
