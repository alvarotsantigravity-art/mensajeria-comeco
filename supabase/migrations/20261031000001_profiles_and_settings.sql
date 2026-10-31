-- Fase 1 · Perfiles de usuario, configuración global y alta restringida al dominio.
-- La app no envía emails: el admin crea las cuentas (auth.admin.createUser).

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- app_settings: una única fila con la configuración global (§5.7)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                   boolean primary key default true check (id),
  courier_to           text[]  not null default array['info@lrmensajeros.com'],
  courier_cc           text[]  not null default array['recepcionjv40bis@vocento.com'],
  subject_template     text    not null default 'Solicitud mensajería · {urgencia} · {empresa} · {fecha}',
  sender_name          text    not null default 'Comeco Gráfico',
  sender_address       text    not null default 'C. Meridiano, 19',
  sender_postal_code   text    not null default '28850',
  sender_city          text    not null default 'Torrejón de Ardoz',
  sender_province      text    not null default 'Madrid',
  sender_phone         text    not null default '916 76 75 04',
  office_province      text    not null default 'Madrid',
  default_company      text    not null default 'Comeco Gráfico',
  default_ceco         text    not null default '2690600250',
  search_daily_limit   integer not null default 30 check (search_daily_limit between 0 and 1000),
  label_offsets        jsonb   not null default '{"top": 0, "left": 0}'::jsonb,
  allowed_domains      text[]  not null default array['comecografico.com'],
  initial_admin_email  text    not null default 'atubio@comecografico.com',
  updated_at           timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- profiles: 1:1 con auth.users
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text not null unique,
  full_name             text not null default '',
  phone                 text,
  company               text not null default 'Comeco Gráfico',
  default_ceco          text not null default '2690600250',
  role                  text not null default 'user' check (role in ('user', 'admin')),
  active                boolean not null default true,
  must_change_password  boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers usados por las políticas RLS
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and active
  );
$$;

-- ---------------------------------------------------------------------------
-- Alta de usuario: solo dominios permitidos; crea el perfil automáticamente.
-- Se ejecuta tanto con auth.admin.createUser como desde el panel de Supabase.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.app_settings;
  email_domain text := split_part(lower(new.email), '@', 2);
begin
  select * into settings from public.app_settings where id;

  if email_domain = '' or not (email_domain = any (settings.allowed_domains)) then
    raise exception 'Dominio de email no permitido: %', email_domain
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, email, full_name, company, default_ceco, role, must_change_password)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    settings.default_company,
    settings.default_ceco,
    case when lower(new.email) = lower(settings.initial_admin_email) then 'admin' else 'user' end,
    coalesce((new.raw_user_meta_data ->> 'must_change_password')::boolean, true)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Un usuario normal solo puede cambiar sus datos personales, no su rol,
-- estado, email ni el flag de cambio de contraseña.
-- auth.uid() es null para service_role y el editor SQL: se permite.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    new.role := old.role;
    new.active := old.active;
    new.email := old.email;
    new.must_change_password := old.must_change_password;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;

create policy "app_settings: lectura para usuarios activos"
  on public.app_settings for select to authenticated
  using (public.is_active_user());

create policy "app_settings: solo admin modifica"
  on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Los nombres de los compañeros se muestran en el historial compartido.
create policy "profiles: lectura para usuarios activos"
  on public.profiles for select to authenticated
  using (public.is_active_user() or id = (select auth.uid()));

create policy "profiles: cada uno edita el suyo"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "profiles: admin edita todos"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Sin políticas de insert/delete: solo el trigger y el service_role crean o borran perfiles.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_columns() from public, anon, authenticated;
