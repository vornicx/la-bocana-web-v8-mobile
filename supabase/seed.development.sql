-- SOLO PARA DESARROLLO / QA. No representa el plano ni el aforo real de La Bocana.
-- Antes de producción, Archic debe sustituir estas mesas/capacidades por los datos validados con el restaurante.

insert into areas(name,slug,sort_order) values ('Terraza','terraza',1),('Interior','interior',2) on conflict(slug) do nothing;
insert into services(name,slug,default_duration_minutes,auto_confirm) values ('Comida','comida',105,true),('Cena','cena',105,true) on conflict(slug) do nothing;

insert into availability_rules(service_id,day_of_week,open_time,close_time,slot_interval_minutes,max_covers,min_notice_minutes,booking_horizon_days,min_party_size,max_party_size)
select s.id,d,'13:00','16:30',15,70,60,90,1,12 from services s cross join generate_series(1,6) d where s.slug='comida'
on conflict do nothing;
insert into availability_rules(service_id,day_of_week,open_time,close_time,slot_interval_minutes,max_covers,min_notice_minutes,booking_horizon_days,min_party_size,max_party_size)
select s.id,d,'19:30','23:30',15,90,60,90,1,12 from services s cross join generate_series(1,6) d where s.slug='cena'
on conflict do nothing;

insert into reservation_duration_rules(service_id,min_party_size,max_party_size,duration_minutes)
select id,1,2,90 from services on conflict do nothing;
insert into reservation_duration_rules(service_id,min_party_size,max_party_size,duration_minutes)
select id,3,4,105 from services on conflict do nothing;
insert into reservation_duration_rules(service_id,min_party_size,max_party_size,duration_minutes)
select id,5,6,120 from services on conflict do nothing;
insert into reservation_duration_rules(service_id,min_party_size,max_party_size,duration_minutes)
select id,7,12,135 from services on conflict do nothing;

insert into tables(area_id,name,min_capacity,max_capacity,position_x,position_y,shape)
select a.id,x.name,x.min_c,x.max_c,x.px,x.py,x.shape from areas a cross join (values
 ('T01',1,2,10,15,'round'),('T02',1,2,26,15,'round'),('T03',2,4,43,15,'round'),('T04',2,4,62,15,'round'),
 ('T05',2,4,80,15,'round'),('T06',4,6,18,48,'rectangle'),('T07',4,6,46,48,'rectangle'),('T08',6,8,75,48,'rectangle')
) as x(name,min_c,max_c,px,py,shape) where a.slug='terraza' on conflict(name) do nothing;

insert into table_combinations(area_id,name,min_capacity,max_capacity)
select a.id,'T03+T04',5,8 from areas a where a.slug='terraza' on conflict(name) do nothing;
insert into table_combination_members(combination_id,table_id)
select c.id,t.id from table_combinations c join tables t on t.name in ('T03','T04') where c.name='T03+T04' on conflict do nothing;
