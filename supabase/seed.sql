-- Stable development identifiers make application fixtures and API tests
-- reproducible. These are not production records.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
(
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin.one@foodapp.local',
  extensions.crypt('local-admin-one', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Admin One"}'::jsonb,
  now(),
  now()
),
(
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin.two@foodapp.local',
  extensions.crypt('local-admin-two', extensions.gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Admin Two"}'::jsonb,
  now(),
  now()
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values
(
  '00000000-0000-4000-8000-000000000011',
  '00000000-0000-4000-8000-000000000001',
  'admin.one@foodapp.local',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000001',
    'email', 'admin.one@foodapp.local',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
),
(
  '00000000-0000-4000-8000-000000000012',
  '00000000-0000-4000-8000-000000000002',
  'admin.two@foodapp.local',
  jsonb_build_object(
    'sub', '00000000-0000-4000-8000-000000000002',
    'email', 'admin.two@foodapp.local',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do update
set identity_data = excluded.identity_data,
    updated_at = now();

insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000001', 'Admin One'),
  ('00000000-0000-4000-8000-000000000002', 'Admin Two')
on conflict (id) do update set display_name = excluded.display_name;

insert into public.businesses (id, name, legal_name) values
  (
    '10000000-0000-4000-8000-000000000001',
    'The Greeks Family',
    'The Greeks Family GmbH'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Pita Corner Family',
    'Pita Corner Family GmbH'
  )
on conflict (id) do update
set name = excluded.name, legal_name = excluded.legal_name;

insert into public.business_admins (business_id, user_id, role) values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    'admin'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'owner'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000002',
    'admin'
  )
on conflict (business_id, user_id) do update set role = excluded.role;

insert into public.restaurants (
  id,
  business_id,
  name,
  slug,
  status,
  phone,
  email,
  address_line,
  postal_code,
  city,
  accepts_delivery,
  accepts_cash_on_delivery
) values
(
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'The Greeks Mitte',
  'the-greeks-mitte',
  'active',
  '+49305550101',
  'mitte@thegreeks.example',
  'Torstraße 104',
  '10119',
  'Berlin',
  true,
  true
),
(
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000002',
  'Pita Corner',
  'pita-corner',
  'active',
  '+49895550166',
  'hello@pitacorner.example',
  'Sendlinger Straße 42',
  '80331',
  'München',
  true,
  false
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status;

insert into public.restaurant_opening_hours (
  restaurant_id, day_of_week, opens_at, closes_at, closed
)
select
  restaurant.id,
  day.day_of_week,
  '12:00'::time,
  '22:00'::time,
  false
from (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid),
    ('20000000-0000-4000-8000-000000000002'::uuid)
) as restaurant(id)
cross join generate_series(0, 6) as day(day_of_week)
on conflict (restaurant_id, day_of_week) do update set
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at,
  closed = excluded.closed;

insert into public.menu_categories (
  id, restaurant_id, name, sort_order
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    'Beliebt',
    10
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    'Hauptgerichte',
    20
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    'Beilagen',
    30
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    'Getränke',
    40
  ),
  (
    '30000000-0000-4000-8000-000000000011',
    '20000000-0000-4000-8000-000000000002',
    'Beliebt',
    10
  ),
  (
    '30000000-0000-4000-8000-000000000012',
    '20000000-0000-4000-8000-000000000002',
    'Hauptgerichte',
    20
  ),
  (
    '30000000-0000-4000-8000-000000000013',
    '20000000-0000-4000-8000-000000000002',
    'Beilagen',
    30
  ),
  (
    '30000000-0000-4000-8000-000000000014',
    '20000000-0000-4000-8000-000000000002',
    'Getränke',
    40
  )
on conflict (id) do update
set name = excluded.name, sort_order = excluded.sort_order;

insert into public.menu_items (
  id,
  restaurant_id,
  category_id,
  code,
  name,
  description,
  price_minor,
  sort_order
) values
(
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'mitte-souvlaki',
  'Chicken Souvlaki',
  'Hähnchenspieße, Pita, Tzatziki und Salat',
  1550,
  10
),
(
  '40000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'mitte-moussaka',
  'Moussaka',
  'Aubergine, Kartoffeln, Rinderhack und Béchamel',
  1700,
  20
),
(
  '40000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'mitte-mixed-grill',
  'Mixed Grill',
  'Souvlaki, Gyros, Bifteki, Pommes und Tzatziki',
  2450,
  30
),
(
  '40000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  'mitte-salad',
  'Griechischer Salat',
  'Tomate, Gurke, Feta, Oliven und rote Zwiebel',
  950,
  40
),
(
  '40000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'mitte-gyros-pita',
  'Gyros Pita',
  'Gyros, Tzatziki, Tomate, Zwiebel und Pommes',
  850,
  50
),
(
  '40000000-0000-4000-8000-000000000006',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000003',
  'mitte-tzatziki',
  'Tzatziki',
  'Hausgemacht, mit Pita',
  500,
  60
),
(
  '40000000-0000-4000-8000-000000000007',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000004',
  'mitte-water',
  'Mineralwasser',
  'Still oder sprudelnd, 0,5 l',
  350,
  70
),
(
  '40000000-0000-4000-8000-000000000011',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000011',
  'pita-falafel',
  'Falafel Pita',
  'Falafel, Tahini, Tomate, Gurke und Kräuter',
  800,
  10
),
(
  '40000000-0000-4000-8000-000000000012',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000012',
  'pita-gyros',
  'Gyros Pita',
  'Gyros, Tzatziki, Tomate, Zwiebel und Pommes',
  850,
  20
),
(
  '40000000-0000-4000-8000-000000000013',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000012',
  'pita-halloumi',
  'Halloumi Bowl',
  'Halloumi, Couscous, Salat und Zitronendressing',
  1350,
  30
),
(
  '40000000-0000-4000-8000-000000000014',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000013',
  'pita-tzatziki',
  'Tzatziki',
  'Hausgemacht, mit Pita',
  500,
  40
),
(
  '40000000-0000-4000-8000-000000000015',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000014',
  'pita-lemonade',
  'Hauslimonade',
  'Zitrone und Minze, 0,4 l',
  400,
  50
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  price_minor = excluded.price_minor,
  category_id = excluded.category_id,
  sort_order = excluded.sort_order;
