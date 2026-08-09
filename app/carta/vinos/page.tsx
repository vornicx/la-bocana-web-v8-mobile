import { MenuCatalog } from '@/components/menu-catalog';
import { PublicPage } from '@/components/public-page';
import { wineMenu } from '@/lib/menu-data';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({
  title: 'Carta de vinos',
  description: 'Carta oficial de vinos de La Bocana: blancos, rosados, tintos, cavas y champagne.',
  path: '/carta/vinos',
  image: '/images/gallery-official/mesa-vista.webp',
});

export default function VinosPage() {
  return (
    <PublicPage
      eyebrow="Carta · Bodega"
      title="Una botella para cada sobremesa."
      intro="Una selección que recorre grandes denominaciones, referencias de la casa y vinos por copa."
      image="/images/gallery-official/mesa-vista.webp"
    >
      <MenuCatalog categories={wineMenu} current="wine" />
      <aside className="menu-legal-note" aria-label="Información sobre la carta de vinos">
        <span>Información importante</span>
        <p>Las añadas y la disponibilidad pueden variar. Consulta con el equipo la referencia disponible en el momento de tu visita.</p>
        <a href="https://www.restaurantelabocana.es/wines/" target="_blank" rel="noreferrer">Consultar fuente oficial</a>
      </aside>
    </PublicPage>
  );
}
