import Image from 'next/image';
import Link from 'next/link';
import type { MenuCategory } from '@/lib/menu-data';

type MenuCatalogProps = {
  categories: MenuCategory[];
  current: 'food' | 'wine';
};

export function MenuCatalog({ categories, current }: MenuCatalogProps) {
  const itemCount = categories.reduce((total, category) => total + category.items.length, 0);

  return (
    <div className="menu-catalog">
      <div className="menu-catalog-head">
        <div>
          <span>La carta oficial</span>
          <p>{itemCount} referencias organizadas para encontrar cada propuesta con calma.</p>
        </div>
        <nav className="menu-switcher" aria-label="Secciones de la carta">
          <Link href="/carta" aria-current={current === 'food' ? 'page' : undefined}>Cocina</Link>
          <Link href="/carta/vinos" aria-current={current === 'wine' ? 'page' : undefined}>Vinos</Link>
        </nav>
      </div>

      <nav className="menu-category-nav" aria-label="Categorías">
        {categories.map((category, index) => (
          <a href={`#${category.id}`} key={category.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {category.name}
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
                <h2>{category.name}</h2>
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
                        <summary>Ver plato</summary>
                        <div className="menu-photo-panel">
                          <div>
                            <Image
                              src={item.image}
                              alt={item.imageAlt || item.name}
                              fill
                              sizes="(max-width: 700px) 92vw, 560px"
                            />
                          </div>
                          <p>Fotografía oficial · {item.name}</p>
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
