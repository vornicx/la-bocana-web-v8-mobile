import Image from 'next/image';
import Link from 'next/link';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { BrandMark } from '@/components/brand-mark';
import { HeroVideo } from '@/components/hero-video';
import { createPublicMetadata, restaurantStructuredData } from '@/lib/site';

export const metadata = createPublicMetadata({ path: '/' });

const highlights = [
  { title: 'Pescados y mariscos', text: 'Producto fresco, preparaciones directas y el punto justo.', image: '/images/pescado-la-bocana-real.jpeg' },
  { title: 'Arroces', text: 'Sabores reconocibles, fondo mediterráneo y mesa larga.', image: '/images/paella-la-bocana.jpg' },
  { title: 'Cocina andaluza', text: 'Recetas de siempre, frituras y cocina con memoria.', image: '/images/croquetas-la-bocana-real.jpeg' },
];

const reviews = [
  {
    author: 'Raul Tejeda',
    text: 'Comimos una paella espectacular: arroz en su punto, sabor auténtico y productos fresquísimos. El servicio fue impecable, cercano y profesional.',
    detail: 'Compartida por La Bocana · 5,0 / 5',
  },
  {
    author: 'Virginia Gonzalez',
    text: 'Un lugar con una ubicación espectacular. Si tenemos en cuenta la magnífica atención del personal, es para volver sin dudar.',
    detail: 'Compartida por La Bocana · 5,0 / 5',
  },
  {
    author: 'Dinu Alexandra',
    text: 'La comida es deliciosa, pero lo mejor es el servicio. Te hacen sentir bienvenido y a gusto en cualquier momento.',
    detail: 'Reseña traducida · 5,0 / 5',
  },
];

export default function HomePage() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main-content">
      <section className="public-hero">
        <HeroVideo />
        <div className="public-hero-shade" />
        <div className="public-hero-copy">
          <span>Restaurante · Puerto Banús</span>
          <h1>El Mediterráneo,<br /><em>en cada bocado.</em></h1>
          <p>Producto fresco, cocina con memoria y una mesa abierta al mar.</p>
          <div><Link className="hero-cta" href="/reservar">Reservar mesa</Link><Link className="hero-link" href="/cocina">Descubrir la cocina</Link></div>
        </div>
        <div className="public-hero-note"><strong>2025</strong><span>Traveler&apos;s Choice<br />Best of the Best</span></div>
      </section>

      <section className="brand-manifesto public-section">
        <BrandMark />
        <p>Más que un restaurante.</p>
        <h2>Un lugar<br />para quedarse.</h2>
        <span>Mar · Mesa · Ambiente</span>
      </section>

      <section className="public-intro public-section">
        <div className="public-section-label">La casa</div>
        <div className="public-intro-copy"><h2>La mesa empieza<br />en el horizonte.</h2><p>La Bocana forma parte del paisaje de Puerto Banús desde hace décadas: producto reconocible, servicio cercano y una terraza donde el Mediterráneo marca el ritmo.</p><Link href="/la-casa">Nuestra historia</Link></div>
        <div className="public-intro-stat"><strong>1987</strong><span>Desde entonces, junto al mar</span></div>
      </section>

      <section className="editorial-pair public-section">
        <div className="editorial-image tall"><Image src="/images/sobremesa-la-bocana-real.jpeg" alt="Sobremesa en la terraza de La Bocana frente al mar" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
        <div className="editorial-copy"><span>La experiencia</span><h2>El puerto baja<br />el ritmo aquí.</h2><p>Una terraza abierta al agua, el movimiento de los barcos y esa luz que convierte una comida en una sobremesa sin prisa.</p><Link href="/galeria">Ver la atmósfera</Link></div>
      </section>

      <section className="public-cuisine public-section">
        <div className="cuisine-head"><span>Cocina y producto</span><h2>Producto, tradición<br />y temporada.</h2><p>La carta gira alrededor del Mediterráneo y de una cocina que no necesita disfrazar el producto para tener personalidad.</p></div>
        <div className="cuisine-grid">{highlights.map((item) => <article key={item.title}><div className="cuisine-image"><Image src={item.image} alt={item.title} fill sizes="(max-width: 800px) 100vw, 33vw" /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        <Link className="text-cta" href="/carta">Ver la carta completa</Link>
      </section>

      <section className="public-gallery public-section">
        <div className="gallery-a"><Image src="/images/pescado-mediterraneo-la-bocana.jpeg" alt="Pescado de La Bocana servido junto al faro" fill sizes="40vw" /></div>
        <div className="gallery-b"><Image src="/images/croquetas-la-bocana-real.jpeg" alt="Croquetas de La Bocana servidas en la terraza" fill sizes="60vw" /></div>
        <div className="gallery-copy"><span>Mar, mesa y ambiente</span><h2>El siguiente recuerdo<br />empieza aquí.</h2><Link href="/galeria">Abrir galería</Link></div>
      </section>

      <section className="public-reviews public-section">
        <div className="reviews-head">
          <span>Lo cuentan quienes vuelven</span>
          <h2>La experiencia,<br />en sus palabras.</h2>
          <p>La ubicación abre la conversación. El producto y la atención hacen que la mesa se recuerde.</p>
        </div>
        <div className="reviews-grid">
          {reviews.map((review, index) => (
            <article key={review.author}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <blockquote>“{review.text}”</blockquote>
              <footer><strong>{review.author}</strong><small>{review.detail}</small></footer>
            </article>
          ))}
        </div>
        <div className="reviews-proof"><strong>Best of the Best 2025</strong><span>Traveler&apos;s Choice · Puerto Banús</span></div>
      </section>

      <section className="public-reserve public-section">
        <BrandMark />
        <span>Tu mesa</span><h2>Nos vemos<br />junto al mar.</h2><p>Puerto Banús · Complejo Benabola · Bloque 1</p><div><Link className="reserve-main" href="/reservar">Reservar mesa</Link><Link className="reserve-secondary" href="/contacto">Cómo llegar</Link></div>
      </section>
      </main>
      <PublicFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData).replace(/</g, '\\u003c') }} />
    </div>
  );
}
