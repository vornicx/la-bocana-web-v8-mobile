import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app';
  const pages = ['', '/cocina', '/la-casa', '/galeria', '/carta', '/contacto', '/reservar'];
  return pages.map((path) => ({ url: `${baseUrl}${path}`, changeFrequency: path === '' ? 'weekly' : 'monthly', priority: path === '' ? 1 : path === '/reservar' ? 0.9 : 0.7 }));
}
