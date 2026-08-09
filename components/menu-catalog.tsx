import Image from 'next/image';
import Link from 'next/link';
import type { MenuCategory } from '@/lib/menu-data';
import type { PublicLocale } from '@/lib/i18n';

type MenuCatalogProps = {
  categories: MenuCategory[];
  current: 'food' | 'wine';
  locale?: PublicLocale;
};

const englishCategories: Record<string, string> = {
  'Para empezar': 'To begin', 'Ibéricos': 'Iberian charcuterie', 'Especialidades': 'Specialities', 'Pastas': 'Pasta', 'Arroces y paellas': 'Rice and paella', 'Pescados y mariscos': 'Fish and seafood', 'Carnes': 'Meat', 'Guarniciones y salsas': 'Sides and sauces', 'Vinos blancos': 'White wines', 'Vinos rosados': 'Rosé wines', 'Vinos tintos': 'Red wines', 'Cavas y champagne': 'Cava and champagne',
};

const englishItemNames: Record<string, string> = {
  'Carpaccio de ternera': 'Beef carpaccio', 'Gazpacho andaluz': 'Andalusian gazpacho', 'Aguacate con gambas': 'Avocado with prawns',
  'Ensaladilla rusa': 'Russian salad', 'Ensalada mixta': 'Mixed salad', 'Ensalada de pimientos asados': 'Roasted pepper salad', 'Ensalada César': 'Caesar salad',
  'Ensalada tropical': 'Tropical salad', 'Boquerones en vinagre': 'Anchovies in vinegar', 'Salpicón de marisco': 'Seafood salad', 'Croquetas caseras': 'Homemade croquettes',
  'Albóndigas caseras': 'Homemade meatballs', 'Berenjenas con miel de caña': 'Aubergines with cane honey', 'Jamón ibérico': 'Iberian ham',
  'Caña de lomo ibérico': 'Iberian cured loin', 'Salchichón ibérico': 'Iberian salchichón', 'Chorizo ibérico': 'Iberian chorizo',
  'Surtido ibérico': 'Assorted Iberian charcuterie', 'Queso manchego': 'Manchego cheese', 'Fritura malagueña': 'Málaga-style fried fish selection',
  'Boquerones fritos': 'Fried anchovies', 'Calamares fritos': 'Fried squid', 'Rosada frita': 'Fried rosada fish', 'Puntillitas fritas': 'Fried baby squid',
  'Gambas a la plancha o cocidas': 'Grilled or boiled prawns', 'Almejas salteadas o a la marinera': 'Sautéed or marinara-style clams',
  'Mejillones al vapor': 'Steamed mussels', 'Pulpo a la gallega': 'Galician-style octopus', 'Gambas al pilpil': 'Pil-pil prawns',
  'Espaguetis boloñesa de carne o atún': 'Spaghetti bolognese with meat or tuna', 'Espaguetis a la marinera': 'Seafood spaghetti',
  'Espaguetis carbonara': 'Spaghetti carbonara', 'Espaguetis La Bocana con gambas picantes': 'La Bocana spaghetti with spicy prawns',
  'Paella de bogavante': 'Lobster paella', 'Paella mixta de carne y marisco': 'Mixed meat and seafood paella', 'Paella vegetariana': 'Vegetarian paella',
  'Paella especial de marisco': 'Special seafood paella', 'Paella de pollo y verduras': 'Chicken and vegetable paella',
  'Brocheta de rape y gambas': 'Monkfish and prawn skewer', 'Carabineros': 'Scarlet prawns', 'Parrillada de marisco': 'Grilled seafood platter',
  'Parrillada especial de marisco': 'Special grilled seafood platter', 'Lenguado a la plancha': 'Grilled sole', 'Dorada a la plancha': 'Grilled sea bream',
  'Salmón a la plancha': 'Grilled salmon', 'Calamar a la plancha': 'Grilled squid', 'Lubina': 'Sea bass', 'Pargo': 'Red seabream', 'Rodaballo': 'Turbot',
  'Ostras': 'Oysters', 'Conchas finas': 'Smooth clams', 'Pescado del día': 'Catch of the day', 'Filete de pollo': 'Chicken fillet',
  'Entrecot de ternera': 'Beef rib-eye', 'Solomillo de ternera': 'Beef tenderloin', 'Brocheta de solomillo de ternera': 'Beef tenderloin skewer',
  'Chuletas de cordero': 'Lamb cutlets', 'Brocheta de pollo': 'Chicken skewer', 'Pollo al limón': 'Lemon chicken', 'Ración de patatas fritas': 'French fries',
  'Ensalada': 'Salad', 'Arroz cocido': 'Boiled rice', 'Salsa a la pimienta': 'Peppercorn sauce', 'Salsa rosa': 'Marie Rose sauce',
  'Media botella Tierra Blanca': 'Half bottle of Tierra Blanca', 'Copa de Coral do Mar Albariño': 'Glass of Coral do Mar Albariño',
  'Copa de Tierra Blanca': 'Glass of Tierra Blanca', 'Copa de La Bocana': 'Glass of La Bocana', 'Media botella De Casta Torres': 'Half bottle of De Casta Torres',
  'Media botella Marqués de Riscal Reserva': 'Half bottle of Marqués de Riscal Reserva', 'Copa de Fuentespina': 'Glass of Fuentespina',
};

const englishNotes: Record<string, string> = {
  'Según mercado': 'Market price', 'Aprox. 400 g': 'Approx. 400 g', 'Por 100 g': 'Per 100 g', 'Unidad': 'Each',
  'Precio y disponibilidad según mercado': 'Price and availability according to market',
};

export function MenuCatalog({ categories, current, locale = 'es' }: MenuCatalogProps) {
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);
  const t = locale === 'es' ? { official: 'La carta oficial', count: `${itemCount} referencias organizadas para encontrar cada propuesta con calma.`, sections: 'Secciones de la carta', food: 'Carta', wine: 'Vinos', categories: 'Categorías', photo: 'Ver plato', officialPhoto: 'Fotografía oficial', foodPath: '/carta', winePath: '/carta/vinos' } : { official: 'The official menu', count: `${itemCount} references, organised so you can explore every proposal at your own pace.`, sections: 'Menu sections', food: 'Menu', wine: 'Wine list', categories: 'Categories', photo: 'View dish', officialPhoto: 'Official photography', foodPath: '/en/menu', winePath: '/en/menu/wines' };

  return (
    <div className="menu-catalog">
      <div className="menu-catalog-head">
        <div>
          <span>{t.official}</span>
          <p>{t.count}</p>
        </div>
        <nav className="menu-switcher" aria-label={t.sections}>
          <Link href={t.foodPath} aria-current={current === 'food' ? 'page' : undefined}>{t.food}</Link>
          <Link href={t.winePath} aria-current={current === 'wine' ? 'page' : undefined}>{t.wine}</Link>
        </nav>
      </div>

      <nav className="menu-category-nav" aria-label={t.categories}>
        {categories.map((category, index) => (
          <a href={`#${category.id}`} key={category.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {locale === 'en' ? (englishCategories[category.name] || category.name) : category.name}
          </a>
        ))}
      </nav>

      <div className="menu-categories">
        {categories.map((category, categoryIndex) => (
          <section className="menu-category" id={category.id} key={category.id}>
            <header className="menu-category-head">
              <span>{String(categoryIndex + 1).padStart(2, '0')}</span>
              <div>
                <p>{category.eyebrow}</p>
                <h2>{locale === 'en' ? (englishCategories[category.name] || category.name) : category.name}</h2>
                {category.intro && <small>{category.intro}</small>}
              </div>
            </header>
            <div className="menu-list">
              {category.items.map((item) => (
                <article className="menu-row" key={`${category.id}-${item.name}`}>
                  <div className="menu-row-copy">
                    <h3>{locale === 'en' ? (englishItemNames[item.name] || item.name) : item.name}</h3>
                    {item.note && <p>{locale === 'en' ? (englishNotes[item.note] || item.note) : item.note}</p>}
                    {item.image && (
                      <details className="menu-photo-details">
                        <summary>{t.photo}</summary>
                        <div className="menu-photo-panel">
                          <div>
                            <Image
                              src={item.image}
                              alt={item.imageAlt || item.name}
                              fill
                              sizes="(max-width: 700px) 92vw, 560px"
                            />
                          </div>
                          <p>{t.officialPhoto} · {item.name}</p>
                        </div>
                      </details>
                    )}
                  </div>
                  <strong>{item.price}</strong>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
