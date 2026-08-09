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
                    <h3>{item.name}</h3>
                    {item.note && <p>{item.note}</p>}
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
