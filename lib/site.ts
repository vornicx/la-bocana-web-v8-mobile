import type { Metadata } from 'next';

export const SITE_NAME = 'La Bocana';
export const SITE_TITLE = 'La Bocana | Puerto Banús';
export const SITE_DESCRIPTION = 'Disfruta del Mediterráneo en cada bocado: cocina, producto y sobremesa frente al mar en Puerto Banús.';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app').replace(/\/$/, '');
export const DEFAULT_SOCIAL_IMAGE = '/images/mesa-frente-al-mar.jpg';

type PublicMetadataOptions = {
  title?: string;
  description?: string;
  path: `/${string}` | '/';
  image?: string;
};

export function createPublicMetadata({
  title,
  description = SITE_DESCRIPTION,
  path,
  image = DEFAULT_SOCIAL_IMAGE,
}: PublicMetadataOptions): Metadata {
  const socialTitle = title ? `${title} | ${SITE_NAME}` : SITE_TITLE;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'es_ES',
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      url: path,
      images: [{ url: image, alt: `${SITE_NAME} · Puerto Banús` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [image],
    },
  };
}

export const restaurantStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}${DEFAULT_SOCIAL_IMAGE}`,
  telephone: '+34 952 781 410',
  servesCuisine: ['Mediterránea', 'Andaluza', 'Pescados y mariscos', 'Arroces'],
  hasMenu: `${SITE_URL}/carta`,
  acceptsReservations: true,
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Complejo Benabola, Bloque 1',
    addressLocality: 'Marbella',
    addressRegion: 'Málaga',
    addressCountry: 'ES',
  },
};
