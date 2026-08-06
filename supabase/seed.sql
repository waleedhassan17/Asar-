-- =====================================================================
-- Asar — seed data
-- Preset missions (M-01) and platform defaults (A-M03, A-M04).
-- Safe to re-run: everything upserts on the natural key.
-- =====================================================================

insert into public.mission_templates
  (slug, title, short_label, icon, category, unit_singular, unit_plural, action_verb,
   default_goal, lives_per_unit, increments, accent, blurb, sort_order)
values
  ('feed-100-people', 'Feed 100 people', 'Feed people', '🍲', 'food',
   'meal', 'meals', 'fund', 100, 1, '{1,5,10}', 'ember',
   'Every meal is one person who eats today.', 10),

  ('plant-50-trees', 'Plant 50 trees', 'Plant trees', '🌳', 'environment',
   'tree', 'trees', 'plant', 50, 1, '{1,3,5}', 'sage',
   'One sapling, decades of shade.', 20),

  ('sponsor-a-student', 'Sponsor a student', 'Sponsor learning', '🎓', 'education',
   'school month', 'school months', 'sponsor', 12, 1, '{1,2,6}', 'violet',
   'A month of school is a month of possibility.', 30),

  ('20-blood-donors', 'Get 20 blood donors', 'Find blood donors', '🩸', 'health',
   'donor', 'donors', 'be', 20, 3, '{1}', 'rose',
   'One donation can help up to three people.', 40)
on conflict (slug) do update set
  title          = excluded.title,
  short_label    = excluded.short_label,
  icon           = excluded.icon,
  category       = excluded.category,
  unit_singular  = excluded.unit_singular,
  unit_plural    = excluded.unit_plural,
  action_verb    = excluded.action_verb,
  default_goal   = excluded.default_goal,
  lives_per_unit = excluded.lives_per_unit,
  increments     = excluded.increments,
  accent         = excluded.accent,
  blurb          = excluded.blurb,
  sort_order     = excluded.sort_order;

-- A-M03: give-links pointing at these hosts skip the moderation queue.
-- Everything else waits for an admin, which is what stops scam links.
insert into public.platform_settings (key, value, label)
values (
  'link_autoapprove_domains',
  '["gofundme.com","justgiving.com","paypal.me","ko-fi.com","buymeacoffee.com","chuffed.org","launchgood.com","edhi.org","saylaniwelfare.com","alkhidmat.org","akhuwat.org.pk","transparenthands.org","indiegogo.com","donorbox.org"]'::jsonb,
  'Domains whose give-links auto-approve'
)
on conflict (key) do nothing;

-- A-M04: how self-reported pledges earn credibility. Read by the UI to
-- label pledges, never used to rank or shame anyone.
insert into public.platform_settings (key, value, label, is_public)
values (
  'trust_rules',
  '{
     "endorsements_for_community_confirmed": 2,
     "proof_boost": 2,
     "endorsement_boost": 1,
     "flags_to_auto_queue": 2,
     "high_volume_goal_fraction": 0.25,
     "labels": {
       "base": "Self-reported",
       "proof": "Proof attached",
       "community": "Friends confirmed"
     }
   }'::jsonb,
  'Trust score configuration',
  true
)
on conflict (key) do nothing;

insert into public.platform_settings (key, value, label, is_public)
values (
  'transparency_note',
  '"Asar tracks pledges and self-reported impact. We are growing our network of verified partners."'::jsonb,
  'Transparency note shown on every mission page (T-04)',
  true
)
on conflict (key) do nothing;

-- =====================================================================
-- Curated donation directory (starter list)
--
-- Every row seeds with is_verified = false on purpose. Verification means
-- a human opened the site, confirmed the domain really belongs to the
-- organization, and copied the current donate-page path — look-alike
-- donation domains exist for well-known charities, so that check cannot
-- be inherited from a seed file. Flip the tick in the admin Organizations
-- manager once you have done it.
--
-- Re-running never un-verifies a row: is_verified and clicks are left
-- alone by the upsert below.
-- =====================================================================
-- `logo_url` points at a self-hosted copy of each organization's own mark in
-- /public/orgs (fetched from their official site rather than hotlinked, so a
-- card never breaks when they redesign). Cards fall back to initials where
-- there's no usable asset. Identifying an organization by its own mark is
-- nominative use — still ask permission before featuring one.
insert into public.organizations
  (slug, name, tagline, description, category, causes, country, website_url, donate_url,
   is_featured, trust_note, sort_order, logo_url)
values
  ('edhi-foundation', 'Edhi Foundation',
   'Pakistan''s largest humanitarian network',
   'Pakistan''s largest humanitarian NGO — 24/7 ambulances, shelters, and care for abandoned infants and orphans. Runs on small donations from ordinary people. Confirm the current donate path before marking this link verified.',
   'emergency_relief', '{emergency,orphans,shelter,children}', 'Pakistan',
   'https://edhi.org', 'https://donate.edhi.org',
   true, 'Official site only — look-alike "Edhi" donation domains exist.', 10, '/orgs/edhi-foundation.png'),

  ('alkhidmat-orphan-care', 'Alkhidmat Foundation — Orphan Care',
   'Aghosh homes and orphan family support',
   'Runs Aghosh orphanage homes and an orphan-family support programme: housing, schooling and healthcare for thousands of orphaned children across Pakistan.',
   'orphan_care', '{orphans,education,shelter,children}', 'Pakistan',
   'https://alkhidmat.org', 'https://alkhidmat.org/orphan',
   true, 'Confirm the live donate path on alkhidmat.org before verifying.', 20, '/orgs/alkhidmat-orphan-care.svg'),

  ('sos-childrens-villages-pakistan', 'SOS Children''s Villages Pakistan',
   'Family-based homes for children without parental care',
   'Family-based homes for orphaned and abandoned children since 1977 — villages, schools and youth homes, with a sponsor-a-child model.',
   'orphan_care', '{orphans,children,shelter,education}', 'Pakistan',
   'https://sos.org.pk', 'https://sos.org.pk/Donations',
   false, 'Confirm the live donate path before verifying.', 30, '/orgs/sos-childrens-villages-pakistan.png'),

  ('saylani-welfare', 'Saylani Welfare',
   'Meals, healthcare and vocational training at scale',
   'Large-scale meal programmes, food rations, healthcare, clean water and free vocational training. One of the most visible feeding operations in Pakistan.',
   'food_hunger', '{meals,health,education,water}', 'Pakistan',
   'https://www.saylaniwelfare.com', 'https://www.saylaniwelfare.com',
   true, 'Confirm the live donate path before verifying.', 40, '/orgs/saylani-welfare.png'),

  ('the-citizens-foundation', 'The Citizens Foundation (TCF)',
   'Schools for children in low-income communities',
   'One of Pakistan''s largest nonprofit school networks — purpose-built schools and trained teachers for children in low-income communities.',
   'education', '{education,children}', 'Pakistan',
   'https://www.tcf.org.pk', 'https://www.tcf.org.pk',
   false, 'Confirm the live donate path before verifying.', 50, '/orgs/the-citizens-foundation.png'),

  ('shaukat-khanum', 'Shaukat Khanum Memorial Cancer Hospital',
   'Free cancer care for those who can''t pay',
   'Free, high-quality cancer diagnosis and treatment for underprivileged patients, funded largely by public donations.',
   'health_medical', '{cancer,health}', 'Pakistan',
   'https://shaukatkhanum.org.pk', 'https://shaukatkhanum.org.pk',
   false, 'Confirm the official donate URL before verifying.', 60, '/orgs/shaukat-khanum.png'),

  ('siut', 'SIUT — Sindh Institute of Urology & Transplantation',
   'Free kidney and transplant care, no one turned away',
   'Free kidney, urology and transplant care under a simple principle: no one is turned away because they cannot pay.',
   'health_medical', '{health}', 'Pakistan',
   'https://www.siut.org', 'https://www.siut.org',
   false, 'Confirm the official donate URL before verifying.', 70, null),

  ('indus-hospital', 'Indus Hospital & Health Network',
   'Free hospital care across a national network',
   'Free, high-quality hospital care across a growing national network — no billing counters at the point of care.',
   'health_medical', '{health,children}', 'Pakistan',
   'https://indushospital.org.pk', 'https://indushospital.org.pk',
   false, 'Confirm the official donate URL before verifying.', 80, '/orgs/indus-hospital.png'),

  ('transparent-hands', 'Transparent Hands',
   'Fund one patient''s surgery, follow the case',
   'Healthcare crowdfunding: you fund a specific patient''s surgery and can follow that case. A good fit when a mission wants one concrete, checkable outcome.',
   'health_medical', '{health,surgery}', 'Pakistan',
   'https://www.transparenthands.org', 'https://www.transparenthands.org',
   false, 'Confirm the official donate URL before verifying.', 90, '/orgs/transparent-hands.svg'),

  ('akhuwat', 'Akhuwat Foundation',
   'Interest-free microloans for families',
   'Interest-free microloans that help families start small businesses and become self-sufficient, alongside education programmes.',
   'microfinance', '{microfinance,education}', 'Pakistan',
   'https://akhuwat.org.pk', 'https://akhuwat.org.pk',
   false, 'Confirm the official donate URL before verifying.', 100, '/orgs/akhuwat.png'),

  ('lrbt', 'LRBT — Layton Rahmatulla Benevolent Trust',
   'Free eye care and sight-restoring surgery',
   'Pakistan''s largest free eye-care network — consultations, medicines and sight-restoring surgery for people who could not otherwise afford them.',
   'health_medical', '{eye-care,health}', 'Pakistan',
   'https://www.lrbt.org.pk', 'https://www.lrbt.org.pk',
   false, 'Confirm the official donate URL before verifying.', 110, '/orgs/lrbt.png'),

  ('chhipa-welfare', 'Chhipa Welfare Association',
   'Ambulances, food and shelter',
   'Ambulance service, food distribution and shelter for orphans, women and the elderly.',
   'emergency_relief', '{emergency,meals,orphans,shelter}', 'Pakistan',
   'https://chhipa.org', 'https://chhipa.org',
   false, 'Confirm the official donate URL before verifying.', 120, null),

  ('jdc-foundation', 'JDC Foundation',
   'Ambulance service, food and welfare relief',
   'Ambulance service, food distribution and general welfare relief, largely in Karachi.',
   'emergency_relief', '{emergency,meals}', 'Pakistan',
   'https://jdcwelfare.org', 'https://jdcwelfare.org',
   false, 'Confirm the official donate URL before verifying.', 130, '/orgs/jdc-foundation.png'),

  ('islamic-relief-worldwide', 'Islamic Relief Worldwide',
   'Orphan sponsorship, water and emergency response',
   'Global NGO working since 1984 — orphan sponsorship, clean water, food and emergency response in more than forty countries.',
   'orphan_care', '{orphans,water,meals,emergency}', 'Global',
   'https://islamic-relief.org', 'https://islamic-relief.org',
   false, 'Country sites differ — confirm the right official domain for your region.', 200, null),

  ('muslim-hands', 'Muslim Hands',
   'Orphan care, schools and water projects',
   'International charity running orphan care, schools and water projects across many countries.',
   'orphan_care', '{orphans,education,water}', 'Global',
   'https://muslimhands.org.uk', 'https://muslimhands.org.uk',
   false, 'Country sites differ — confirm the right official domain for your region.', 210, null),

  ('unicef', 'UNICEF',
   'The UN agency for children',
   'The United Nations agency for children — health, nutrition, education and protection work globally.',
   'general_welfare', '{children,health,education}', 'Global',
   'https://www.unicef.org', 'https://www.unicef.org',
   false, 'National committees run their own domains — confirm the right one.', 220, null),

  ('charity-water', 'charity: water',
   'Clean water projects, 100% model',
   'Funds clean-water projects in the developing world and publishes what each project cost and where it went.',
   'water', '{water}', 'Global',
   'https://www.charitywater.org', 'https://www.charitywater.org',
   false, 'Confirm the official donate URL before verifying.', 230, '/orgs/charity-water.png'),

  ('sharethemeal', 'ShareTheMeal (UN WFP)',
   'Fund a meal from your phone',
   'The UN World Food Programme''s app — fund meals for hungry children with a tap, with per-meal costs shown up front.',
   'food_hunger', '{meals,children}', 'Global',
   'https://sharethemeal.org', 'https://sharethemeal.org',
   false, 'Confirm the official donate URL before verifying.', 240, '/orgs/sharethemeal.png'),

  ('save-the-children', 'Save the Children',
   'Education, health and crisis response for children',
   'Global children''s charity working on education, health and emergency response.',
   'general_welfare', '{children,education,emergency}', 'Global',
   'https://www.savethechildren.net', 'https://www.savethechildren.net',
   false, 'National members run their own domains — confirm the right one.', 250, '/orgs/save-the-children.svg')
on conflict (slug) do update set
  name        = excluded.name,
  tagline     = excluded.tagline,
  description = excluded.description,
  category    = excluded.category,
  causes      = excluded.causes,
  country     = excluded.country,
  website_url = excluded.website_url,
  donate_url  = excluded.donate_url,
  is_featured = excluded.is_featured,
  trust_note  = excluded.trust_note,
  sort_order  = excluded.sort_order,
  logo_url    = excluded.logo_url;
