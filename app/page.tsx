import Image from 'next/image';
import Link from 'next/link';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { createPublicMetadata, restaurantStructuredData } from '@/lib/site';

export const metadata = createPublicMetadata({ path: '/' });

const highlights = [
  { title: 'Pescados y mariscos', text: 'Producto fresco, preparaciones directas y el punto justo.', image: '/images/pescado-la-bocana-real.jpeg' },
  { title: 'Arroces', text: 'Sabores reconocibles, fondo mediterráneo y mesa larga.', image: '/images/paella-la-bocana.jpg' },
  { title: 'Cocina andaluza', text: 'Recetas de siempre, frituras y cocina con memoria.', image: '/images/croquetas-la-bocana-real.jpeg' },
];

export default function HomePage() {
  return (
    <div className="public-site">
      <PublicHeader />
      <main id="main-content">
      <section className="public-hero">
        <Image src="/images/photo-2.jpg" alt="Terraza de La Bocana frente al puerto" fill priority sizes="100vw" />
        <div className="public-hero-shade" />
        <div className="public-hero-copy">
          <span>Puerto Banús · Frente al Mediterráneo</span>
          <h1>Mar de verdad.</h1>
          <p>Cocina andaluza, pescado fresco y arroces servidos a pocos metros del agua.</p>
          <div><Link className="hero-cta" href="/reservar">Reservar mesa <span aria-hidden="true">↗</span></Link><Link className="hero-link" href="/cocina">Descubrir la cocina</Link></div>
        </div>
        <div className="public-hero-note">Una casa familiar frente al mar desde 1987.</div>
      </section>

      <section className="public-intro public-section">
        <div className="public-section-label">La casa</div>
        <div className="public-intro-copy"><h2>Una mesa abierta<br />al Mediterráneo.</h2><p>La Bocana forma parte del paisaje de Puerto Banús desde hace décadas: producto reconocible, servicio cercano y una terraza donde el mar marca el ritmo.</p><Link href="/la-casa">Nuestra historia <span aria-hidden="true">→</span></Link></div>
        <div className="public-intro-stat"><strong>1987</strong><span>Desde entonces, junto al mar</span></div>
      </section>

      <section className="editorial-pair public-section">
        <div className="editorial-image tall"><Image src="/images/sobremesa-la-bocana-real.jpeg" alt="Sobremesa en la terraza de La Bocana frente al mar" fill sizes="(max-width: 800px) 100vw, 50vw" /></div>
        <div className="editorial-copy"><span>Vivir el puerto</span><h2>El puerto baja<br />el ritmo aquí.</h2><p>Una terraza abierta al agua, el movimiento de los barcos y esa luz de última hora que convierte una comida en una tarde entera.</p><Link href="/galeria">Ver la atmósfera <span aria-hidden="true">→</span></Link></div>
      </section>

      <section className="public-cuisine public-section">
        <div className="cuisine-head"><span>Cocina y producto</span><h2>Producto, tradición<br />y temporada.</h2><p>La carta gira alrededor del Mediterráneo y de una cocina que no necesita disfrazar el producto para tener personalidad.</p></div>
        <div className="cuisine-grid">{highlights.map((item) => <article key={item.title}><div className="cuisine-image"><Image src={item.image} alt={item.title} fill sizes="(max-width: 800px) 100vw, 33vw" /></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
        <Link className="text-cta" href="/carta">Ver la carta completa <span aria-hidden="true">→</span></Link>
      </section>

      <section className="public-gallery public-section">
        <div className="gallery-a"><Image src="/images/photo-1.jpg" alt="Terraza junto al Mediterráneo" fill sizes="40vw" /></div>
        <div className="gallery-b"><Image src="/images/mesa-frente-al-mar.jpg" alt="Mesa de La Bocana frente al mar" fill sizes="60vw" /></div>
        <div className="gallery-copy"><span>La experiencia</span><h2>Una sobremesa<br />con horizonte.</h2><Link href="/galeria">Abrir galería <span aria-hidden="true">→</span></Link></div>
      </section>

      <section className="public-reserve public-section">
        <span>Tu mesa</span><h2>Junto al mar.</h2><p>Puerto Banús · Complejo Benabola · Bloque 1</p><div><Link className="reserve-main" href="/reservar">Reservar mesa</Link><Link className="reserve-secondary" href="/contacto">Cómo llegar</Link></div>
      </section>
      </main>
      <PublicFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData).replace(/</g, '\\u003c') }} />
    </div>
  );
}
