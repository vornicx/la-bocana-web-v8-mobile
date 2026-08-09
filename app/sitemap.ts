import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app';
  const pages = ['', '/la-casa', '/galeria', '/carta', '/carta/vinos', '/contacto', '/reservar', '/en', '/en/about', '/en/gallery', '/en/menu', '/en/menu/wines', '/en/contact', '/en/reserve'];
  return pages.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: path === '' ? 'weekly' : 'monthly', priority: path === '' ? 1 : path === '/reservar' ? 0.9 : 0.7 }));
}
