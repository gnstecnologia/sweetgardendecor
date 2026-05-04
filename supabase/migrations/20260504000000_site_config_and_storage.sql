-- Catálogo do site (JSON SiteData). Leitura/escrita via Next.js com SUPABASE_SECRET_KEY (ignora RLS).
create table if not exists public.site_config (
  id text primary key default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists site_config_updated_at_idx on public.site_config (updated_at desc);

alter table public.site_config enable row level security;

comment on table public.site_config is 'SweetGarden: payload JSON do site (carrosséis).';

-- Bucket público para imagens servidas em <img src>.
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update
set public = excluded.public;

-- Leitura anónima dos ficheiros do bucket (URLs públicas do Storage).
drop policy if exists "Public read site-media objects" on storage.objects;
create policy "Public read site-media objects"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-media');
