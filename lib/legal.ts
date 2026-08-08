export const legalIdentity = {
  tradeName: 'Restaurante La Bocana',
  legalName: process.env.LEGAL_BUSINESS_NAME || 'Pendiente de validación por el titular',
  taxId: process.env.LEGAL_TAX_ID || 'Pendiente de validación por el titular',
  registry: process.env.LEGAL_REGISTRY_DETAILS || 'Pendiente de validación, si procede',
  address: 'Complejo Benabola, Bloque 1, 29660 Puerto Banús, Marbella, Málaga',
  phoneDisplay: '+34 952 781 410',
  phoneHref: 'tel:+34952781410',
  email: process.env.LEGAL_CONTACT_EMAIL || 'info@restaurantelabocana.es',
  domain: process.env.NEXT_PUBLIC_SITE_URL || 'https://labocana.vercel.app',
  lastReview: '9 de agosto de 2026',
};

export const legalDataPending = !process.env.LEGAL_BUSINESS_NAME || !process.env.LEGAL_TAX_ID;
