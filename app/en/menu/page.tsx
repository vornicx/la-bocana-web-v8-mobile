import { MenuCatalog } from '@/components/menu-catalog';
import { PublicPage } from '@/components/public-page';
import { loadPublicMenu } from '@/lib/menu-service';
import { createPublicMetadata } from '@/lib/site';

export const metadata = createPublicMetadata({ title: 'Menu', description: 'La Bocana official menu: starters, Iberian charcuterie, specialities, pasta, rice, fish, seafood and meat.', path: '/en/menu', alternatePath: '/carta', locale: 'en', image: '/images/gallery-official/marisco-mediterraneo.webp' });

export default async function MenuPage(){const foodMenu=await loadPublicMenu('food','en');return <PublicPage locale="en" eyebrow="The menu" title="The Mediterranean, dish by dish." intro="Honest produce, house recipes and cooking designed to be shared by the sea." image="/images/gallery-official/marisco-mediterraneo.webp" mobileImage="/images/curated/marisco-mobile.webp" imageAlt="Grilled squid served overlooking the Mediterranean"><MenuCatalog categories={foodMenu} current="food" locale="en" /><aside className="menu-legal-note" aria-label="Menu and allergen information"><span>Important information</span><p>If you have an allergy or intolerance, please tell the team before ordering. Ingredients, availability and market prices may change; confirm current information with the restaurant.</p><a href="https://www.restaurantelabocana.es/food/" target="_blank" rel="noreferrer">View official source</a></aside></PublicPage>}
