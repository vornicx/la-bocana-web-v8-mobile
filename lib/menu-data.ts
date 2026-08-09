export type MenuItem = {
  name: string;
  price: string;
  note?: string;
  image?: string;
  imageAlt?: string;
};

export type MenuCategory = {
  id: string;
  name: string;
  eyebrow: string;
  intro?: string;
  items: MenuItem[];
};

export const foodMenu: MenuCategory[] = [
  {
    id: 'para-empezar',
    name: 'Para empezar',
    eyebrow: 'Frescos, clásicos y para compartir',
    items: [
      { name: 'Carpaccio de ternera', price: '22,00 €' },
      { name: 'Gazpacho andaluz', price: '13,00 €' },
      { name: 'Salmorejo', price: '14,50 €' },
      { name: 'Aguacate con gambas', price: '18,50 €', image: '/images/menu-official/aguacate-gambas.webp', imageAlt: 'Aguacate con gambas servido en La Bocana' },
      { name: 'Ensaladilla rusa', price: '16,50 €' },
      { name: 'Ensalada mixta', price: '12,00 €' },
      { name: 'Ensalada de pimientos asados', price: '15,00 €' },
      { name: 'Ensalada César', price: '18,00 €' },
      { name: 'Ensalada tropical', price: '19,00 €', image: '/images/menu-official/ensalada-tropical.webp', imageAlt: 'Ensalada tropical servida en La Bocana' },
      { name: 'Boquerones en vinagre', price: '15,00 €' },
      { name: 'Salpicón de marisco', price: '15,00 €' },
      { name: 'Croquetas caseras', price: '15,00 €', image: '/images/menu-official/croquetas.webp', imageAlt: 'Croquetas caseras de La Bocana' },
      { name: 'Albóndigas caseras', price: '16,00 €' },
      { name: 'Berenjenas con miel de caña', price: '15,00 €', image: '/images/menu-official/berenjenas-miel.webp', imageAlt: 'Berenjenas con miel de caña servidas en La Bocana' },
    ],
  },
  {
    id: 'ibericos',
    name: 'Ibéricos',
    eyebrow: 'Producto español',
    items: [
      { name: 'Jamón ibérico', price: '28,50 €' },
      { name: 'Caña de lomo ibérico', price: '19,50 €' },
      { name: 'Salchichón ibérico', price: '19,00 €' },
      { name: 'Chorizo ibérico', price: '19,00 €' },
      { name: 'Surtido ibérico', price: '24,00 €' },
      { name: 'Queso manchego', price: '19,00 €' },
    ],
  },
  {
    id: 'especialidades',
    name: 'Especialidades',
    eyebrow: 'El sabor de Málaga y del mar',
    items: [
      { name: 'Fritura malagueña', price: '22,00 €' },
      { name: 'Boquerones fritos', price: '18,00 €' },
      { name: 'Calamares fritos', price: '19,00 €', image: '/images/menu-official/calamares-fritos.webp', imageAlt: 'Calamares fritos de La Bocana' },
      { name: 'Rosada frita', price: '19,00 €' },
      { name: 'Puntillitas fritas', price: '19,00 €' },
      { name: 'Gambas a la plancha o cocidas', price: '22,50 €' },
      { name: 'Almejas salteadas o a la marinera', price: '19,00 €', image: '/images/menu-official/almejas-marina.webp', imageAlt: 'Almejas a la marinera servidas en La Bocana' },
      { name: 'Mejillones al vapor', price: '15,00 €' },
      { name: 'Pulpo a la gallega', price: '22,50 €', image: '/images/menu-official/pulpo-gallega.webp', imageAlt: 'Pulpo a la gallega de La Bocana' },
      { name: 'Gambas al pilpil', price: '19,50 €', image: '/images/menu-official/gambas-pilpil.webp', imageAlt: 'Gambas al pilpil servidas en La Bocana' },
    ],
  },
  {
    id: 'pastas',
    name: 'Pastas',
    eyebrow: 'Recetas de la casa',
    items: [
      { name: 'Espaguetis boloñesa de carne o atún', price: '19,00 €' },
      { name: 'Espaguetis a la marinera', price: '23,00 €', image: '/images/menu-official/espaguetis-marinera.webp', imageAlt: 'Espaguetis a la marinera de La Bocana' },
      { name: 'Espaguetis carbonara', price: '21,00 €', image: '/images/menu-official/espaguetis-carbonara.webp', imageAlt: 'Espaguetis carbonara de La Bocana' },
      { name: 'Espaguetis La Bocana con gambas picantes', price: '24,00 €' },
    ],
  },
  {
    id: 'arroces',
    name: 'Arroces y paellas',
    eyebrow: 'El centro de la mesa',
    intro: 'Los arroces se pueden preparar en paella o caldosos en cazuela. Mínimo dos personas; precio indicado para dos personas.',
    items: [
      { name: 'Paella de bogavante', price: '74,00 €' },
      { name: 'Paella mixta de carne y marisco', price: '46,00 €' },
      { name: 'Paella vegetariana', price: '39,50 €' },
      { name: 'Paella especial de marisco', price: '49,00 €', image: '/images/menu-official/paella-marisco.webp', imageAlt: 'Paella especial de marisco de La Bocana' },
      { name: 'Paella de pollo y verduras', price: '42,00 €' },
    ],
  },
  {
    id: 'pescados',
    name: 'Pescados y mariscos',
    eyebrow: 'Mediterráneo, plancha y producto',
    items: [
      { name: 'Brocheta de rape y gambas', price: '29,00 €' },
      { name: 'Carabineros', price: 'S/M', note: 'Según mercado' },
      { name: 'Parrillada de marisco', price: '43,00 €' },
      { name: 'Parrillada especial de marisco', price: '99,00 €' },
      { name: 'Lenguado a la plancha', price: '29,00 €', note: 'Aprox. 400 g' },
      { name: 'Dorada a la plancha', price: '25,00 €' },
      { name: 'Salmón a la plancha', price: '25,00 €', image: '/images/menu-official/salmon.webp', imageAlt: 'Salmón a la plancha servido en La Bocana' },
      { name: 'Calamar a la plancha', price: '23,00 €', note: 'Aprox. 400 g' },
      { name: 'Lubina', price: '7,50 €', note: 'Por 100 g', image: '/images/menu-official/lubina.webp', imageAlt: 'Lubina servida en La Bocana' },
      { name: 'Pargo', price: '8,50 €', note: 'Por 100 g' },
      { name: 'Rodaballo', price: '8,00 €', note: 'Por 100 g' },
      { name: 'Ostras', price: '6,00 €', note: 'Unidad' },
      { name: 'Conchas finas', price: '4,00 €', note: 'Unidad' },
      { name: 'Pescado del día', price: 'Consultar', note: 'Precio y disponibilidad según mercado' },
    ],
  },
  {
    id: 'carnes',
    name: 'Carnes',
    eyebrow: 'Plancha y brasa',
    items: [
      { name: 'Filete de pollo', price: '23,00 €' },
      { name: 'Entrecot de ternera', price: '27,50 €', note: '300 g' },
      { name: 'Solomillo de ternera', price: '30,00 €', note: '250 g', image: '/images/menu-official/solomillo-pimienta.webp', imageAlt: 'Solomillo de ternera servido en La Bocana' },
      { name: 'Brocheta de solomillo de ternera', price: '31,00 €' },
      { name: 'Chuletas de cordero', price: '24,00 €' },
      { name: 'Brocheta de pollo', price: '26,00 €', image: '/images/menu-official/brocheta-pollo.webp', imageAlt: 'Brocheta de pollo de La Bocana' },
      { name: 'Pollo al limón', price: '19,50 €', image: '/images/menu-official/pollo-limon.webp', imageAlt: 'Pollo al limón servido en La Bocana' },
    ],
  },
  {
    id: 'acompanamientos',
    name: 'Guarniciones y salsas',
    eyebrow: 'Para completar el plato',
    items: [
      { name: 'Ración de patatas fritas', price: '8,00 €' },
      { name: 'Ensalada', price: '7,00 €' },
      { name: 'Arroz cocido', price: '7,00 €' },
      { name: 'Salsa a la pimienta', price: '2,50 €' },
      { name: 'Alioli', price: '2,50 €' },
      { name: 'Salsa rosa', price: '2,50 €' },
    ],
  },
];

export const wineMenu: MenuCategory[] = [
  {
    id: 'blancos',
    name: 'Vinos blancos',
    eyebrow: 'Atlánticos, mediterráneos y de interior',
    items: [
      { name: 'Louis Latour La Chanfleure', price: '65,00 €', note: 'D.O. Chablis' },
      { name: 'Mar de Frades Albariño', price: '41,00 €', note: 'D.O. Rías Baixas' },
      { name: 'José Pariente Verdejo', price: '36,00 €', note: 'D.O. Rueda' },
      { name: 'Isabel Arranz Verdejo', price: '35,00 €', note: 'D.O. Rueda' },
      { name: 'Pago de los Capellanes Godello', price: '34,00 €', note: 'D.O. Valdeorras' },
      { name: 'Martín Códax Albariño', price: '33,00 €', note: 'D.O. Rías Baixas' },
      { name: 'Coral do Mar Albariño', price: '29,50 €', note: 'D.O. Rías Baixas' },
      { name: 'Marqués de Riscal Sauvignon', price: '33,00 €', note: 'D.O. Rueda' },
      { name: 'Enate Chardonnay 234', price: '31,50 €', note: 'D.O. Somontano' },
      { name: 'Cloe Chardonnay', price: '33,00 €', note: 'D.O. Sierras de Málaga' },
      { name: 'Viña Sol', price: '25,50 €', note: 'D.O. Catalunya' },
      { name: 'Tierra Blanca', price: '24,50 €', note: 'D.O. Cádiz' },
      { name: 'La Bocana', price: '24,50 €', note: 'D.O. Rueda' },
      { name: 'Media botella Tierra Blanca', price: '14,00 €', note: 'D.O. Cádiz' },
      { name: 'Copa de Coral do Mar Albariño', price: '5,50 €', note: 'D.O. Rías Baixas' },
      { name: 'Copa de Tierra Blanca', price: '5,00 €', note: 'D.O. Cádiz' },
      { name: 'Copa de La Bocana', price: '5,00 €', note: 'D.O. Rueda' },
    ],
  },
  {
    id: 'rosados',
    name: 'Vinos rosados',
    eyebrow: 'Ligeros y gastronómicos',
    items: [
      { name: 'Barton & Guestier', price: '42,00 €', note: 'D.O. Côtes de Provence' },
      { name: 'Cloe Rosé', price: '33,00 €', note: 'D.O. Sierras de Málaga' },
      { name: 'Marqués de Riscal Rosado', price: '29,00 €', note: 'D.O. Rioja' },
      { name: 'De Casta Torres', price: '26,00 €', note: 'D.O. Catalunya' },
      { name: 'Media botella De Casta Torres', price: '14,00 €', note: 'D.O. Catalunya' },
      { name: 'La Bocana', price: '24,50 €', note: 'D.O. Huelva' },
      { name: 'Copa de La Bocana', price: '5,00 €', note: 'D.O. Huelva' },
    ],
  },
  {
    id: 'tintos',
    name: 'Vinos tintos',
    eyebrow: 'Rioja, Ribera y otras procedencias',
    items: [
      { name: 'Flor de Pingus', price: '300,00 €', note: 'D.O. Ribera del Duero' },
      { name: 'Pago de Carraovejas Crianza', price: '85,00 €', note: 'D.O. Ribera del Duero' },
      { name: 'Roda I Reserva', price: '88,00 €', note: 'D.O. Rioja' },
      { name: 'Carmelo Rodero Reserva', price: '67,00 €', note: 'D.O. Ribera del Duero' },
      { name: 'Viña Ardanza Reserva', price: '50,00 €', note: 'D.O. Rioja' },
      { name: 'Entrechuelo Premium', price: '42,00 €', note: 'D.O. Cádiz' },
      { name: 'Emilio Moro Crianza', price: '44,50 €', note: 'D.O. Ribera del Duero' },
      { name: 'Pesquera Crianza', price: '42,50 €', note: 'D.O. Ribera del Duero' },
      { name: 'Viña Sastre Crianza', price: '40,00 €', note: 'D.O. Ribera del Duero' },
      { name: 'Marqués de Riscal Reserva', price: '39,00 €', note: 'D.O. Rioja' },
      { name: 'Media botella Marqués de Riscal Reserva', price: '21,00 €', note: 'D.O. Rioja' },
      { name: 'Marqués de Cáceres', price: '26,50 €', note: 'D.O. Rioja' },
      { name: 'Fuentespina', price: '29,50 €', note: 'D.O. Ribera del Duero' },
      { name: 'La Bocana', price: '24,50 €', note: 'D.O. Rioja' },
      { name: 'Copa de Fuentespina', price: '5,50 €', note: 'D.O. Ribera del Duero' },
      { name: 'Copa de La Bocana', price: '5,00 €', note: 'D.O. Rioja' },
    ],
  },
  {
    id: 'espumosos',
    name: 'Cavas y champagne',
    eyebrow: 'Para brindar frente al mar',
    items: [
      { name: 'Dom Pérignon', price: '380,00 €', note: 'Champagne' },
      { name: 'Laurent-Perrier Cuvée Rosé Brut', price: '200,00 €', note: 'Champagne' },
      { name: 'Moët & Chandon Impérial', price: '130,00 €', note: 'Champagne' },
      { name: 'Anna de Codorníu', price: '34,00 €', note: 'Cava' },
      { name: 'Cinzano', price: '33,50 €', note: 'Prosecco' },
      { name: 'Anna de Codorníu Brut Rosé', price: '32,00 €', note: 'Cava' },
      { name: 'Benjamín de Codorníu', price: '9,00 €' },
    ],
  },
];
