import Image from 'next/image';
import Link from 'next/link';
import { BrandMark } from '@/components/brand-mark';
import { ExperienceMotion } from '@/components/experience-motion';
import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { localePaths, type PublicLocale } from '@/lib/i18n';
import { restaurantStructuredData } from '@/lib/site';
import { ArtDirectedImage } from '@/components/art-directed-image';

const copy = {
  es: {
    heroEyebrow: 'Puerto Banús · Marbella', heroTitle: 'Mar de verdad.', heroText: 'Cocina mediterránea, producto reconocible y una mesa donde el horizonte también forma parte del servicio.', reserve: 'Reservar mesa', discover: 'Descubrir La Bocana', distinction: 'Traveler’s Choice', award: 'Best of the Best 2025', location: 'Primera línea de mar', openingEyebrow: 'La promesa', openingTitle: 'Aquí no vienes solo a comer.', openingText: 'Vienes a bajar el ritmo, a compartir el centro de la mesa y a ver cómo cambia la luz sobre el puerto. La Bocana no necesita inventar un paisaje: lleva el Mediterráneo servido de serie.', journeyEyebrow: 'Una comida en La Bocana', journeyTitle: 'Del primer brindis a la última conversación.',
    chapters: [
      { number: '01', eyebrow: 'Llegar', title: 'Una mesa que ya estaba esperando.', text: 'Mantelería blanca, el movimiento del puerto y el mar a pocos metros. El espacio prepara el ánimo antes de que llegue el primer plato.', desktop: '/images/gallery-official/mesa-atardecer.webp', mobile: '/images/curated/mesa-atardecer-mobile.webp', alt: 'Mesa de La Bocana preparada frente al mar al atardecer' },
      { number: '02', eyebrow: 'Compartir', title: 'Producto con el Mediterráneo de fondo.', text: 'Pescados, mariscos, arroces y recetas andaluzas. Una cocina directa, pensada para reconocerse y disfrutarse sin artificios.', desktop: '/images/gallery-official/brocheta-servicio.webp', mobile: '/images/curated/brocheta-servicio-mobile.webp', alt: 'Servicio de una brocheta en la terraza de La Bocana' },
      { number: '03', eyebrow: 'Quedarse', title: 'La sobremesa también está en la carta.', text: 'La atención cercana, una copa aún en la mesa y ninguna prisa por levantarse. Hay recuerdos que empiezan justo después del postre.', desktop: '/images/gallery-official/ambiente.webp', mobile: '/images/curated/ambiente-mobile.webp', alt: 'Clientes atendidos en la terraza de La Bocana frente al mar' },
    ],
    menuEyebrow: 'La carta', menuTitle: 'El sabor empieza en el producto.', menuText: 'Una selección para abrir el apetito. La carta completa recoge todas las referencias oficiales y muestra fotografía real cuando está disponible.', seeDish: 'Ver en la carta', fullMenu: 'Explorar la carta completa', dishes: [
      { title: 'Arroces', note: 'Para compartir', image: '/images/menu-official/paella-marisco.webp', alt: 'Paella de marisco de La Bocana' },
      { title: 'Del mar', note: 'Pescados y mariscos', image: '/images/gallery-official/pulpo-terraza.webp', alt: 'Pulpo servido en la terraza de La Bocana' },
      { title: 'Cocina andaluza', note: 'Recetas reconocibles', image: '/images/croquetas-la-bocana-real.jpeg', alt: 'Croquetas servidas en La Bocana' },
    ],
    pauseEyebrow: 'La experiencia', pauseTitle: 'Una sobremesa con horizonte.', pauseText: 'El puerto baja el ritmo aquí.', gallery: 'Entrar en la galería',
    reviewsEyebrow: 'Quienes ya se sentaron', reviewsTitle: 'Lo que permanece después de la mesa.', reviews: [
      { author: 'Raul Tejeda', text: 'Comimos una paella espectacular: arroz en su punto, sabor auténtico y productos fresquísimos. El servicio fue impecable, cercano y profesional.' },
      { author: 'Virginia Gonzalez', text: 'Un lugar con una ubicación espectacular. Si tenemos en cuenta la magnífica atención del personal, es para volver sin dudar.' },
    ], reviewSource: 'Reseña compartida por La Bocana · 5 de 5',
    endEyebrow: 'Tu próxima mesa', endTitle: 'El Mediterráneo se disfruta mejor desde aquí.', endText: 'Complejo Benabola · Bloque 1 · Puerto Banús', directions: 'Cómo llegar', mobileReserve: 'Reservar',
  },
  en: {
    heroEyebrow: 'Puerto Banús · Marbella', heroTitle: 'The real sea.', heroText: 'Mediterranean cuisine, honest produce and a table where the horizon is part of the service.', reserve: 'Book a table', discover: 'Discover La Bocana', distinction: 'Traveler’s Choice', award: 'Best of the Best 2025', location: 'Right on the seafront', openingEyebrow: 'The promise', openingTitle: 'You do not come here just to eat.', openingText: 'You come to slow down, share the centre of the table and watch the light change over the harbour. La Bocana has no need to invent a setting: the Mediterranean comes as standard.', journeyEyebrow: 'A meal at La Bocana', journeyTitle: 'From the first toast to the last conversation.',
    chapters: [
      { number: '01', eyebrow: 'Arrive', title: 'A table that was already waiting.', text: 'White linen, the movement of the harbour and the sea just metres away. The setting changes your pace before the first dish arrives.', desktop: '/images/gallery-official/mesa-atardecer.webp', mobile: '/images/curated/mesa-atardecer-mobile.webp', alt: 'A La Bocana table set by the sea at sunset' },
      { number: '02', eyebrow: 'Share', title: 'Produce with the Mediterranean behind it.', text: 'Fish, seafood, rice and Andalusian recipes. Direct cooking designed to be recognised and enjoyed without unnecessary artifice.', desktop: '/images/gallery-official/brocheta-servicio.webp', mobile: '/images/curated/brocheta-servicio-mobile.webp', alt: 'A skewer being served on La Bocana terrace' },
      { number: '03', eyebrow: 'Stay', title: 'The long lunch is part of the menu.', text: 'Warm service, one more glass on the table and no hurry to leave. Some memories begin just after dessert.', desktop: '/images/gallery-official/ambiente.webp', mobile: '/images/curated/ambiente-mobile.webp', alt: 'Guests being looked after on La Bocana seafront terrace' },
    ],
    menuEyebrow: 'The menu', menuTitle: 'Flavour begins with the produce.', menuText: 'A glimpse to whet your appetite. The full menu includes every official reference and real photography wherever available.', seeDish: 'See on the menu', fullMenu: 'Explore the full menu', dishes: [
      { title: 'Rice dishes', note: 'Made for sharing', image: '/images/menu-official/paella-marisco.webp', alt: 'La Bocana seafood paella' },
      { title: 'From the sea', note: 'Fish and seafood', image: '/images/gallery-official/pulpo-terraza.webp', alt: 'Octopus served on La Bocana terrace' },
      { title: 'Andalusian cuisine', note: 'Familiar recipes', image: '/images/croquetas-la-bocana-real.jpeg', alt: 'Croquettes served at La Bocana' },
    ],
    pauseEyebrow: 'The experience', pauseTitle: 'A long lunch with a horizon.', pauseText: 'The harbour slows down here.', gallery: 'Enter the gallery',
    reviewsEyebrow: 'From those who joined us', reviewsTitle: 'What stays with you after the table.', reviews: [
      { author: 'Raul Tejeda', text: 'We had a spectacular paella: perfectly cooked rice, authentic flavour and exceptionally fresh produce. The service was impeccable, warm and professional.' },
      { author: 'Virginia Gonzalez', text: 'A place in a spectacular location. Add the wonderful attention from the team and it is somewhere you will return to without hesitation.' },
    ], reviewSource: 'Review shared by La Bocana · 5 out of 5',
    endEyebrow: 'Your next table', endTitle: 'The Mediterranean is best enjoyed from here.', endText: 'Complejo Benabola · Block 1 · Puerto Banús', directions: 'Get directions', mobileReserve: 'Book',
  },
} as const;

export function HomeExperience({ locale = 'es' }: { locale?: PublicLocale }) {
  const t = copy[locale];
  const paths = localePaths[locale];
  return (
    <div className="public-site experience-home">
      <ExperienceMotion />
      <PublicHeader locale={locale} />
      <main id="main-content">
        <section className="experience-hero">
          <picture className="experience-hero-picture">
            <source media="(max-width: 700px)" srcSet="/images/photo-6.jpg" />
            <img src="/images/mesa-frente-al-mar.jpg" alt={locale === 'es' ? 'Terraza de La Bocana preparada frente al Mediterráneo' : 'La Bocana terrace set overlooking the Mediterranean'} width="1600" height="1140" fetchPriority="high" />
          </picture>
          <div className="experience-hero-overlay" />
          <div className="experience-hero-copy">
            <span>{t.heroEyebrow}</span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>
            <Link className="experience-primary" href={paths.reserve}>{t.reserve}</Link>
          </div>
          <div className="experience-hero-proof"><span>{t.distinction}</span><strong>{t.award}</strong></div>
          <a className="experience-scroll" href="#la-experiencia"><span>{t.discover}</span><i /></a>
        </section>

        <section className="experience-opening public-section" id="la-experiencia" data-reveal>
          <span>{t.openingEyebrow}</span>
          <div><h2>{t.openingTitle}</h2><p>{t.openingText}</p></div>
          <BrandMark />
        </section>

        <section className="experience-journey">
          <header className="experience-section-head public-section" data-reveal><span>{t.journeyEyebrow}</span><h2>{t.journeyTitle}</h2></header>
          {t.chapters.map((chapter, index) => (
            <article className={`experience-chapter${index % 2 ? ' reverse' : ''}`} key={chapter.number}>
              <div className="experience-chapter-media" data-reveal>
                <ArtDirectedImage desktop={chapter.desktop} mobile={chapter.mobile} alt={chapter.alt} />
                <span>{chapter.number} / 03</span>
              </div>
              <div className="experience-chapter-copy" data-reveal>
                <span>{chapter.eyebrow}</span><h3>{chapter.title}</h3><p>{chapter.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="experience-menu public-section">
          <header className="experience-menu-head" data-reveal><span>{t.menuEyebrow}</span><h2>{t.menuTitle}</h2><p>{t.menuText}</p></header>
          <div className="experience-dishes">
            {t.dishes.map((dish, index) => (
              <Link href={paths.menu} className="experience-dish" key={dish.title} data-reveal>
                <div><Image src={dish.image} alt={dish.alt} fill sizes="(max-width: 700px) 90vw, 31vw" /><span>{String(index + 1).padStart(2, '0')}</span></div>
                <p>{dish.note}</p><h3>{dish.title}</h3><small>{t.seeDish}</small>
              </Link>
            ))}
          </div>
          <Link className="experience-text-link" href={paths.menu}>{t.fullMenu}</Link>
        </section>

        <section className="experience-pause">
          <ArtDirectedImage desktop="/images/gallery-official/mesa-vista.webp" mobile="/images/curated/mesa-vista-mobile.webp" alt={locale === 'es' ? 'Mesa preparada con vistas al mar en La Bocana' : 'A table set with sea views at La Bocana'} />
          <div className="experience-pause-shade" />
          <div data-reveal><span>{t.pauseEyebrow}</span><p>{t.pauseText}</p><h2>{t.pauseTitle}</h2><Link href={paths.gallery}>{t.gallery}</Link></div>
        </section>

        <section className="experience-reviews public-section">
          <header data-reveal><span>{t.reviewsEyebrow}</span><h2>{t.reviewsTitle}</h2></header>
          <div className="experience-review-grid">
            {t.reviews.map((review, index) => <article key={review.author} data-reveal><span>0{index + 1}</span><blockquote>“{review.text}”</blockquote><footer><strong>{review.author}</strong><small>{t.reviewSource}</small></footer></article>)}
          </div>
        </section>

        <section className="experience-end public-section" data-reveal>
          <BrandMark />
          <span>{t.endEyebrow}</span><h2>{t.endTitle}</h2><p>{t.endText}</p>
          <div><Link className="reserve-main" href={paths.reserve}>{t.reserve}</Link><Link className="reserve-secondary" href={paths.contact}>{t.directions}</Link></div>
        </section>
      </main>
      <PublicFooter locale={locale} />
      <Link className="mobile-reserve-dock" href={paths.reserve}><span>La Bocana</span><strong>{t.mobileReserve}</strong></Link>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantStructuredData).replace(/</g, '\\u003c') }} />
    </div>
  );
}
