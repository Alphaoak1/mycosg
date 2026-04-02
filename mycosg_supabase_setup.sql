-- ═══════════════════════════════════════════════════════════════════
-- MycoSG — Supabase Database Setup
-- Project: htxlvfzbjiozjzumywev.supabase.co
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. LEADS — Information Memorandum gate ──────────────────────────
create table if not exists leads (
  id            uuid default gen_random_uuid() primary key,
  created_at    timestamptz default now(),
  name          text not null,
  email         text not null,
  phone         text,
  lead_type     text check (lead_type in ('individual','family_office','corporate','advisor','other')),
  source        text default 'information_memorandum',
  consent       boolean default false,
  page_url      text,
  status        text default 'new' check (status in ('new','contacted','converted','closed'))
);
comment on table leads is 'Prospects who requested the Information Memorandum';

-- ─── 2. SUBSCRIPTIONS — Mushroom Box orders ──────────────────────────
create table if not exists subscriptions (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  name            text not null,
  email           text not null,
  postcode        text,
  plan            text check (plan in ('The Forager','The Alchemist','The Mycophile')),
  frequency       text check (frequency in ('Weekly','Bi-Weekly')),
  payment_method  text,
  preferences     text,
  status          text default 'pending_payment'
    check (status in ('pending_payment','active','paused','cancelled'))
);
comment on table subscriptions is 'Mushroom Box subscription sign-ups';

-- ─── 3. FARMBOX INTERESTS — FarmBox purchase enquiries ───────────────
create table if not exists farmbox_interests (
  id                 uuid default gen_random_uuid() primary key,
  created_at         timestamptz default now(),
  full_name          text not null,
  email              text not null,
  phone              text,
  purchaser_type     text check (purchaser_type in ('Individual','Family Office','Private Company (Pte. Ltd.)','Other Corporate')),
  units_requested    text,
  acknowledgements   text,
  status             text default 'new'
    check (status in ('new','documents_sent','signed','completed','declined'))
);
comment on table farmbox_interests is 'FarmBox container purchase expressions of interest';

-- ─── 4. BOOKINGS — Workshops / Tours / Cooking Classes ───────────────
create table if not exists bookings (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  experience      text not null,
  preferred_date  date,
  pax_count       text,
  name            text not null,
  email           text not null,
  phone           text,
  notes           text,
  status          text default 'enquiry'
    check (status in ('enquiry','confirmed','payment_pending','completed','cancelled'))
);
comment on table bookings is 'Workshop, farm tour and cooking class bookings';

-- ─── 5. CORPORATE ENQUIRIES ──────────────────────────────────────────
create table if not exists corporate_enquiries (
  id              uuid default gen_random_uuid() primary key,
  created_at      timestamptz default now(),
  programme       text,
  company_name    text not null,
  contact_name    text,
  email           text not null,
  phone           text,
  pax_count       text,
  preferred_date  date,
  notes           text,
  status          text default 'new'
    check (status in ('new','proposal_sent','confirmed','completed','declined'))
);
comment on table corporate_enquiries is 'Corporate team building and event enquiries';

-- ─── 6. SCHOOL BOOKINGS ──────────────────────────────────────────────
create table if not exists school_bookings (
  id               uuid default gen_random_uuid() primary key,
  created_at       timestamptz default now(),
  education_level  text check (education_level in ('primary','secondary','jc_ib','poly_ite')),
  school_name      text not null,
  teacher_name     text,
  email            text not null,
  phone            text,
  student_count    text,
  preferred_date   date,
  notes            text,
  status           text default 'enquiry'
    check (status in ('enquiry','confirmed','completed','cancelled'))
);
comment on table school_bookings is 'Schools programme visit bookings';

-- ─── 7. WHOLESALE ENQUIRIES ──────────────────────────────────────────
create table if not exists wholesale_enquiries (
  id                  uuid default gen_random_uuid() primary key,
  created_at          timestamptz default now(),
  business_name       text not null,
  contact_name        text,
  email               text not null,
  phone               text,
  varieties_requested text,
  weekly_volume_kg    text,
  notes               text,
  status              text default 'new'
    check (status in ('new','sample_sent','onboarded','inactive'))
);
comment on table wholesale_enquiries is 'Restaurant and retailer wholesale pricing enquiries';

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — Allow public insert, restrict reads to auth
-- ═══════════════════════════════════════════════════════════════════

do $$ declare t text;
begin
  foreach t in array array[
    'leads','subscriptions','farmbox_interests',
    'bookings','corporate_enquiries','school_bookings','wholesale_enquiries'
  ]
  loop
    execute format('alter table %I enable row level security', t);

    -- Anyone can insert (public website forms)
    execute format(
      'create policy if not exists "public_insert_%I" on %I
       for insert with check (true)', t, t
    );

    -- Only authenticated users (your admin) can read
    execute format(
      'create policy if not exists "auth_select_%I" on %I
       for select using (auth.role() = ''authenticated'')', t, t
    );

    -- Only authenticated users can update status fields
    execute format(
      'create policy if not exists "auth_update_%I" on %I
       for update using (auth.role() = ''authenticated'')', t, t
    );
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- INDEXES — Speed up admin queries by email and status
-- ═══════════════════════════════════════════════════════════════════

create index if not exists idx_leads_email           on leads(email);
create index if not exists idx_leads_status          on leads(status);
create index if not exists idx_leads_created         on leads(created_at desc);

create index if not exists idx_subs_email            on subscriptions(email);
create index if not exists idx_subs_status           on subscriptions(status);

create index if not exists idx_farmbox_email         on farmbox_interests(email);
create index if not exists idx_farmbox_status        on farmbox_interests(status);

create index if not exists idx_bookings_date         on bookings(preferred_date);
create index if not exists idx_bookings_status       on bookings(status);

create index if not exists idx_corporate_status      on corporate_enquiries(status);
create index if not exists idx_schools_status        on school_bookings(status);
create index if not exists idx_wholesale_status      on wholesale_enquiries(status);

-- ═══════════════════════════════════════════════════════════════════
-- ADMIN VIEW — Unified dashboard query (run to check all submissions)
-- ═══════════════════════════════════════════════════════════════════

create or replace view admin_submissions as
  select 'lead'         as type, id, created_at, name, email, status, source      as detail from leads
  union all
  select 'subscription' as type, id, created_at, name, email, status, plan        as detail from subscriptions
  union all
  select 'farmbox'      as type, id, created_at, full_name as name, email, status, units_requested as detail from farmbox_interests
  union all
  select 'booking'      as type, id, created_at, name, email, status, experience  as detail from bookings
  union all
  select 'corporate'    as type, id, created_at, company_name as name, email, status, programme as detail from corporate_enquiries
  union all
  select 'school'       as type, id, created_at, school_name as name, email, status, education_level as detail from school_bookings
  union all
  select 'wholesale'    as type, id, created_at, business_name as name, email, status, varieties_requested as detail from wholesale_enquiries
  order by created_at desc;

comment on view admin_submissions is 'Unified view of all form submissions — newest first';

-- ═══════════════════════════════════════════════════════════════════
-- DONE. To verify, run:
--   select * from admin_submissions limit 20;
-- ═══════════════════════════════════════════════════════════════════
