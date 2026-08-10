export type PublicLocale = 'es' | 'en';

export const localePaths = {
  es: {
    home: '/', cuisine: '/cocina', about: '/la-casa', gallery: '/galeria', menu: '/carta', wines: '/carta/vinos', contact: '/contacto', reserve: '/reservar', lookup: '/consultar-reserva',
  },
  en: {
    home: '/en', cuisine: '/en/cuisine', about: '/en/about', gallery: '/en/gallery', menu: '/en/menu', wines: '/en/menu/wines', contact: '/en/contact', reserve: '/en/reserve', lookup: '/en/check-booking',
  },
} as const;

const routePairs = [
  ['/', '/en'],
  ['/cocina', '/en/cuisine'],
  ['/la-casa', '/en/about'],
  ['/galeria', '/en/gallery'],
  ['/carta', '/en/menu'],
  ['/carta/vinos', '/en/menu/wines'],
  ['/contacto', '/en/contact'],
  ['/reservar', '/en/reserve'],
  ['/consultar-reserva', '/en/check-booking'],
  ['/aviso-legal', '/en/legal'],
  ['/privacidad', '/en/privacy'],
  ['/cookies', '/en/cookies'],
  ['/condiciones-reserva', '/en/booking-terms'],
] as const;

export function alternateLocalePath(pathname: string, locale: PublicLocale) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const pair = routePairs.find(([es, en]) => normalized === es || normalized === en);
  if (pair) return locale === 'es' ? pair[1] : pair[0];
  return locale === 'es' ? '/en' : '/';
}

export const chromeCopy = {
  es: {
    homeLabel: 'La Bocana, inicio', navLabel: 'Principal', cuisine: 'Cocina', about: 'La casa', gallery: 'Galería', menu: 'Carta', contact: 'Contacto', reserve: 'Reservar', lookup: 'Consultar reserva', open: 'Abrir menú', close: 'Cerrar menú', language: 'Cambiar idioma', legal: 'Información legal', legalNotice: 'Aviso legal', privacy: 'Privacidad', cookies: 'Cookies', terms: 'Condiciones', privacySettings: 'Preferencias de privacidad', skip: 'Saltar al contenido principal', mediterranean: 'Mediterráneo', table: 'Tu mesa', reserveTitle: 'Una mesa junto al Mediterráneo.', reserveButton: 'Reservar mesa',
  },
  en: {
    homeLabel: 'La Bocana, home', navLabel: 'Main', cuisine: 'Cuisine', about: 'Our story', gallery: 'Gallery', menu: 'Menu', contact: 'Contact', reserve: 'Book', lookup: 'Check booking', open: 'Open menu', close: 'Close menu', language: 'Change language', legal: 'Legal information', legalNotice: 'Legal notice', privacy: 'Privacy', cookies: 'Cookies', terms: 'Booking terms', privacySettings: 'Privacy preferences', skip: 'Skip to main content', mediterranean: 'Mediterranean', table: 'Your table', reserveTitle: 'A table by the Mediterranean.', reserveButton: 'Book a table',
  },
} as const;
