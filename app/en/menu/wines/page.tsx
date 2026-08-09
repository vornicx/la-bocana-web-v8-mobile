import { MenuCatalog } from '@/components/menu-catalog';
import { PublicPage } from '@/components/public-page';
import { wineMenu } from '@/lib/menu-data';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ title: 'Wine list', description: 'La Bocana official wine list: white, rosé and red wines, cava and champagne.', path: '/en/menu/wines', alternatePath: '/carta/vinos', locale: 'en', image: '/images/gallery-official/mesa-vista.webp' });

export default function WinesPage(){return <PublicPage locale="en" eyebrow="Menu · Cellar" title="A bottle for every long lunch." intro="A selection spanning renowned denominations, house references and wines by the glass." image="/images/gallery-official/mesa-vista.webp" mobileImage="/images/curated/mesa-vista-mobile.webp" imageAlt="A table set with wine glasses overlooking the Mediterranean"><MenuCatalog categories={wineMenu} current="wine" locale="en" /><aside className="menu-legal-note" aria-label="Wine list information"><span>Important information</span><p>Vintages and availability may vary. Ask the team which reference is available during your visit.</p><a href="https://www.restaurantelabocana.es/wines/" target="_blank" rel="noreferrer">View official source</a></aside></PublicPage>}
