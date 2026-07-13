-- =====================================================================
-- Multi-site white-label platform schema.
-- Run this in the Supabase SQL editor against your project.
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  site_name text not null,
  domains text[] not null default '{}',
  logo_url text,
  bg_url text,
  theme jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  telegram_bot_token text,
  telegram_chat_id text,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sites_one_default
  on public.sites ((1)) where is_default = true;

create index if not exists sites_domains_gin
  on public.sites using gin (domains);

create or replace view public.sites_public as
  select id, slug, site_name, domains, logo_url, bg_url,
         theme, content, features, active, is_default
  from public.sites
  where active = true;

grant select on public.sites_public to anon, authenticated;
grant all on public.sites to service_role;

alter table public.sites enable row level security;

alter table public.loan_applications
  add column if not exists site_id uuid references public.sites(id) on delete set null;

create index if not exists loan_applications_site_id_idx
  on public.loan_applications (site_id);

insert into public.sites (slug, site_name, domains, logo_url, theme, content,
                          telegram_bot_token, telegram_chat_id, features,
                          active, is_default)
values (
  'salaam',
  'Salaam Somali Bank',
  array['salaambankloan.vercel.app', 'localhost', '127.0.0.1'],
  '/salaam-logo.png',
  jsonb_build_object(
    'primary',   'oklch(0.6 0.18 150)',
    'secondary', 'oklch(0.88 0.07 220)',
    'accent',    'oklch(0.82 0.1 220)',
    'background','oklch(0.98 0.02 200)',
    'foreground','oklch(0.2 0.05 160)'
  ),
  jsonb_build_object(
    'tagline', 'Instant loans paid directly to your Waafi mobile wallet.',
    'walletName', 'Waafi',
    'banner', 'Funds are disbursed straight to your Waafi mobile wallet as soon as your application is approved — Approval takes less than 5 mins for successful application.',
    'phonePrefix', '+252'
  ),
  null, null,
  jsonb_build_object('calculator', true, 'otpFlow', true),
  true, true
)
on conflict (slug) do nothing;

update public.loan_applications
set site_id = (select id from public.sites where is_default = true limit 1)
where site_id is null;