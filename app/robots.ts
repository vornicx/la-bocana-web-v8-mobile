import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app';
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      disallow: ['/control', '/admin', '/admin-login', '/api/', '/reserva/'],
    }],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
