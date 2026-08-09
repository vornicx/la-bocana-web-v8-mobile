-- Complete bilingual menu content. Proper wine names and protected Spanish culinary names remain unchanged.

update public.menu_categories as category set
  eyebrow_en = translated.eyebrow_en,
  intro_en = translated.intro_en
from (values
  ('para-empezar','Fresh, classic and made for sharing',null),
  ('ibericos','Spanish produce',null),
  ('especialidades','The flavours of Málaga and the sea',null),
  ('pastas','Recipes from our kitchen',null),
  ('arroces','At the centre of the table','Rice dishes can be prepared as paella or served brothy in a casserole. Minimum two people; price shown for two.'),
  ('pescados','Mediterranean produce from the grill',null),
  ('carnes','From the grill',null),
  ('acompanamientos','To complete your dish',null),
  ('blancos','Atlantic, Mediterranean and inland wines',null),
  ('rosados','Light and food-friendly',null),
  ('tintos','Rioja, Ribera and beyond',null),
  ('espumosos','For a toast by the sea',null)
) as translated(slug,eyebrow_en,intro_en)
where category.slug = translated.slug;

update public.menu_items as item set
  name_en = translated.name_en,
  note_en = case item.note_es
    when 'Según mercado' then 'Market price'
    when 'Aprox. 400 g' then 'Approx. 400 g'
    when 'Por 100 g' then 'Per 100 g'
    when 'Unidad' then 'Each'
    when 'Precio y disponibilidad según mercado' then 'Price and availability according to market'
    else item.note_en
  end,
  image_alt_en = case when item.image_path is not null then translated.name_en || ' served at La Bocana' else item.image_alt_en end
from (values
  ('Carpaccio de ternera','Beef carpaccio'),('Gazpacho andaluz','Andalusian gazpacho'),('Salmorejo','Salmorejo'),
  ('Aguacate con gambas','Avocado with prawns'),('Ensaladilla rusa','Russian salad'),('Ensalada mixta','Mixed salad'),
  ('Ensalada de pimientos asados','Roasted pepper salad'),('Ensalada César','Caesar salad'),('Ensalada tropical','Tropical salad'),
  ('Boquerones en vinagre','Anchovies in vinegar'),('Salpicón de marisco','Seafood salad'),('Croquetas caseras','Homemade croquettes'),
  ('Albóndigas caseras','Homemade meatballs'),('Berenjenas con miel de caña','Aubergines with cane honey'),('Jamón ibérico','Iberian ham'),
  ('Caña de lomo ibérico','Iberian cured loin'),('Salchichón ibérico','Iberian salchichón'),('Chorizo ibérico','Iberian chorizo'),
  ('Surtido ibérico','Assorted Iberian charcuterie'),('Queso manchego','Manchego cheese'),('Fritura malagueña','Málaga-style fried fish selection'),
  ('Boquerones fritos','Fried anchovies'),('Calamares fritos','Fried squid'),('Rosada frita','Fried rosada fish'),('Puntillitas fritas','Fried baby squid'),
  ('Gambas a la plancha o cocidas','Grilled or boiled prawns'),('Almejas salteadas o a la marinera','Sautéed or marinara-style clams'),
  ('Mejillones al vapor','Steamed mussels'),('Pulpo a la gallega','Galician-style octopus'),('Gambas al pilpil','Pil-pil prawns'),
  ('Espaguetis boloñesa de carne o atún','Spaghetti bolognese with meat or tuna'),('Espaguetis a la marinera','Seafood spaghetti'),
  ('Espaguetis carbonara','Spaghetti carbonara'),('Espaguetis La Bocana con gambas picantes','La Bocana spaghetti with spicy prawns'),
  ('Paella de bogavante','Lobster paella'),('Paella mixta de carne y marisco','Mixed meat and seafood paella'),('Paella vegetariana','Vegetarian paella'),
  ('Paella especial de marisco','Special seafood paella'),('Paella de pollo y verduras','Chicken and vegetable paella'),
  ('Brocheta de rape y gambas','Monkfish and prawn skewer'),('Carabineros','Scarlet prawns'),('Parrillada de marisco','Grilled seafood platter'),
  ('Parrillada especial de marisco','Special grilled seafood platter'),('Lenguado a la plancha','Grilled sole'),('Dorada a la plancha','Grilled sea bream'),
  ('Salmón a la plancha','Grilled salmon'),('Calamar a la plancha','Grilled squid'),('Lubina','Sea bass'),('Pargo','Red seabream'),('Rodaballo','Turbot'),
  ('Ostras','Oysters'),('Conchas finas','Smooth clams'),('Pescado del día','Catch of the day'),('Filete de pollo','Chicken fillet'),
  ('Entrecot de ternera','Beef rib-eye'),('Solomillo de ternera','Beef tenderloin'),('Brocheta de solomillo de ternera','Beef tenderloin skewer'),
  ('Chuletas de cordero','Lamb cutlets'),('Brocheta de pollo','Chicken skewer'),('Pollo al limón','Lemon chicken'),('Ración de patatas fritas','French fries'),
  ('Ensalada','Salad'),('Arroz cocido','Boiled rice'),('Salsa a la pimienta','Peppercorn sauce'),('Alioli','Alioli'),('Salsa rosa','Marie Rose sauce'),
  ('Media botella Tierra Blanca','Half bottle of Tierra Blanca'),('Copa de Coral do Mar Albariño','Glass of Coral do Mar Albariño'),
  ('Copa de Tierra Blanca','Glass of Tierra Blanca'),('Copa de La Bocana','Glass of La Bocana'),('Media botella De Casta Torres','Half bottle of De Casta Torres'),
  ('Media botella Marqués de Riscal Reserva','Half bottle of Marqués de Riscal Reserva'),('Copa de Fuentespina','Glass of Fuentespina')
) as translated(name_es,name_en)
where item.name_es = translated.name_es;

-- Wine names are proper nouns. Populate the remaining nulls without altering them.
update public.menu_items item set name_en = item.name_es
from public.menu_categories category
where item.category_id = category.id and category.menu_type = 'wine' and item.name_en is null;
