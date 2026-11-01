-- Fase 2 · Libreta compartida, solicitudes, plantillas y buscador (caché + cuota).
-- RLS en todas las tablas. Lectura para usuarios activos; las solicitudes solo las
-- edita su creador o un admin; la libreta es compartida.

-- ---------------------------------------------------------------------------
-- Búsqueda tolerante a tildes y errores (pg_trgm + unaccent)
-- unaccent() no es IMMUTABLE: envoltorio con diccionario explícito para poder indexar.
-- ---------------------------------------------------------------------------
create or replace function public.f_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value);
$$;

create or replace function public.recipient_search_text(company text, city text, contact text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(public.f_unaccent(concat_ws(' ', company, city, contact)));
$$;

-- ---------------------------------------------------------------------------
-- recipients: libreta de direcciones compartida (§5.5)
-- ---------------------------------------------------------------------------
create table public.recipients (
  id              uuid primary key default gen_random_uuid(),
  company_name    text not null check (length(trim(company_name)) > 0),
  address         text,
  postal_code     text,
  city            text,
  province        text,
  country         text not null default 'España',
  contact_person  text,
  phone           text,
  email           text,
  notes           text,
  source_url      text,
  verified_at     timestamptz,
  is_favorite     boolean not null default false,
  usage_count     integer not null default 0 check (usage_count >= 0),
  last_used_at    timestamptz,
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  updated_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index recipients_search_trgm on public.recipients
  using gin (public.recipient_search_text(company_name, city, contact_person) extensions.gin_trgm_ops);
create index recipients_favorite_recent on public.recipients (is_favorite desc, last_used_at desc nulls last);

create or replace function public.recipients_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  -- Las estadísticas de uso solo las mantiene el trigger de solicitudes
  -- (SECURITY DEFINER: allí current_user es el propietario, no 'authenticated').
  if current_user = 'authenticated' then
    new.usage_count := old.usage_count;
    new.last_used_at := old.last_used_at;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create trigger recipients_touch
  before update on public.recipients
  for each row execute function public.recipients_touch();

-- Autocompletado del campo "Destinatario". Vacío → favoritos y recientes.
create or replace function public.search_recipients(q text default '', max_results integer default 8)
returns setof public.recipients
language sql
stable
set search_path = ''
as $$
  with term as (select lower(public.f_unaccent(trim(coalesce(q, '')))) as t)
  select r.*
  from public.recipients r, term
  where term.t = ''
     or term.t operator(extensions.<%) public.recipient_search_text(r.company_name, r.city, r.contact_person)
     or public.recipient_search_text(r.company_name, r.city, r.contact_person) like '%' || term.t || '%'
  order by
    case when term.t = '' then 0
         else extensions.word_similarity(term.t, public.recipient_search_text(r.company_name, r.city, r.contact_person))
    end desc,
    r.is_favorite desc,
    r.last_used_at desc nulls last,
    r.usage_count desc
  limit least(greatest(coalesce(max_results, 8), 1), 50);
$$;

-- ---------------------------------------------------------------------------
-- shipment_requests: solicitudes con snapshot del destino (§5.2, §7)
-- Los campos del servicio son opcionales mientras es borrador.
-- ---------------------------------------------------------------------------
create table public.shipment_ref_counters (
  year  integer primary key,
  last  integer not null default 0
);

create table public.shipment_requests (
  id                uuid primary key default gen_random_uuid(),
  ref               text not null unique default '', -- la asigna el trigger de alta
  request_date      date not null default (now() at time zone 'Europe/Madrid')::date,
  requester_id      uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  requester_name    text not null default '',
  requester_phone   text,
  requester_email   text,
  company           text not null default 'Comeco Gráfico',
  ceco              text not null default '2690600250',
  concept           text,
  description       text,
  recipient_id      uuid references public.recipients (id) on delete set null,
  dest_company      text,
  dest_address      text,
  dest_postal_code  text,
  dest_city         text,
  dest_province     text,
  dest_country      text not null default 'España',
  dest_contact      text,
  dest_phone        text,
  urgency           text check (urgency in ('urgente', 'estandar', 'economico')),
  scope             text check (scope in ('local', 'nacional', 'internacional')),
  transport         text check (transport in ('moto', 'furgoneta', 'camion')),
  shipment_type     text check (shipment_type in ('documentacion', 'caja')),
  box_count         integer check (box_count >= 1),
  email_cc          text[] not null default '{}',
  status            text not null default 'borrador'
                      check (status in ('borrador', 'enviada', 'entregada', 'cancelada')),
  email_subject     text,
  email_body        text,
  sent_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Fuera de borrador, una caja necesita nº de cajas.
  constraint shipment_box_count_required
    check (status = 'borrador' or shipment_type is distinct from 'caja' or box_count is not null)
);

create index shipment_requests_date on public.shipment_requests (request_date desc, created_at desc);
create index shipment_requests_requester on public.shipment_requests (requester_id, created_at desc);
create index shipment_requests_status on public.shipment_requests (status);
create index shipment_requests_recipient on public.shipment_requests (recipient_id);

-- Referencia correlativa por año: MSJ-2026-0001.
create or replace function public.shipment_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_year integer := extract(year from new.request_date)::integer;
  next_value integer;
begin
  insert into public.shipment_ref_counters as c (year, last)
  values (ref_year, 1)
  on conflict (year) do update set last = c.last + 1
  returning last into next_value;

  new.ref := format('MSJ-%s-%s', ref_year, lpad(next_value::text, 4, '0'));
  if new.status = 'enviada' and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end;
$$;

create trigger shipment_requests_before_insert
  before insert on public.shipment_requests
  for each row execute function public.shipment_requests_before_insert();

create or replace function public.shipment_requests_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.ref := old.ref;
  new.created_at := old.created_at;
  -- Solo un admin reasigna una solicitud a otro compañero.
  if (select auth.uid()) is not null and not public.is_admin() then
    new.requester_id := old.requester_id;
  end if;
  if new.status = 'enviada' and old.status is distinct from 'enviada' and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end;
$$;

create trigger shipment_requests_before_update
  before update on public.shipment_requests
  for each row execute function public.shipment_requests_before_update();

-- Al enviarse, actualiza "nº de envíos" y "último envío" del destinatario.
create or replace function public.shipment_requests_track_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recipient_id is not null
     and new.status = 'enviada'
     and (tg_op = 'INSERT' or old.status is distinct from 'enviada') then
    update public.recipients
    set usage_count = usage_count + 1,
        last_used_at = coalesce(new.sent_at, now())
    where id = new.recipient_id;
  end if;
  return null;
end;
$$;

create trigger shipment_requests_track_recipient
  after insert or update of status on public.shipment_requests
  for each row execute function public.shipment_requests_track_recipient();

-- ---------------------------------------------------------------------------
-- request_templates: envíos frecuentes (§5.5)
-- ---------------------------------------------------------------------------
create table public.request_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  payload     jsonb not null default '{}'::jsonb,
  shared      boolean not null default true,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index request_templates_created_by on public.request_templates (created_by);

create trigger request_templates_updated_at
  before update on public.request_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Buscador de empresas: caché (30 días) y cuota por usuario (§5.3)
-- Escribe solo el servidor con service_role; los usuarios leen.
-- ---------------------------------------------------------------------------
create table public.company_search_cache (
  id                uuid primary key default gen_random_uuid(),
  query_normalized  text not null unique,
  result            jsonb not null,
  provider          text not null,
  created_at        timestamptz not null default now()
);

create table public.search_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  query       text not null,
  provider    text not null,
  cached      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index search_usage_user_day on public.search_usage (user_id, created_at desc);
create index search_usage_created on public.search_usage (created_at desc);

-- Contadores para la UI y el límite diario (día y mes en hora de Madrid).
create or replace function public.search_usage_stats()
returns table (user_today integer, team_month integer, daily_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.search_usage
      where user_id = (select auth.uid()) and not cached
        and created_at >= date_trunc('day', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'),
    (select count(*)::integer from public.search_usage
      where not cached
        and created_at >= date_trunc('month', now() at time zone 'Europe/Madrid') at time zone 'Europe/Madrid'),
    (select search_daily_limit from public.app_settings where id)
  where public.is_active_user();
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.recipients enable row level security;
alter table public.shipment_ref_counters enable row level security;
alter table public.shipment_requests enable row level security;
alter table public.request_templates enable row level security;
alter table public.company_search_cache enable row level security;
alter table public.search_usage enable row level security;

-- recipients: libreta compartida.
create policy "recipients: lectura para usuarios activos"
  on public.recipients for select to authenticated
  using (public.is_active_user());

create policy "recipients: alta para usuarios activos"
  on public.recipients for insert to authenticated
  with check (public.is_active_user() and created_by = (select auth.uid()));

create policy "recipients: edición para usuarios activos"
  on public.recipients for update to authenticated
  using (public.is_active_user()) with check (public.is_active_user());

create policy "recipients: borra su creador o un admin"
  on public.recipients for delete to authenticated
  using (public.is_admin() or (public.is_active_user() and created_by = (select auth.uid())));

-- shipment_ref_counters: sin políticas (solo el trigger SECURITY DEFINER).

-- shipment_requests: todos leen el historial; cada uno edita las suyas.
create policy "shipment_requests: lectura para usuarios activos"
  on public.shipment_requests for select to authenticated
  using (public.is_active_user());

create policy "shipment_requests: alta propia"
  on public.shipment_requests for insert to authenticated
  with check (public.is_active_user() and requester_id = (select auth.uid()));

create policy "shipment_requests: edita su creador"
  on public.shipment_requests for update to authenticated
  using (public.is_active_user() and requester_id = (select auth.uid()))
  with check (requester_id = (select auth.uid()));

create policy "shipment_requests: admin edita todas"
  on public.shipment_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "shipment_requests: borra borradores propios o admin"
  on public.shipment_requests for delete to authenticated
  using (public.is_admin()
         or (public.is_active_user() and requester_id = (select auth.uid()) and status = 'borrador'));

-- request_templates: compartidas o propias.
create policy "request_templates: lectura compartidas o propias"
  on public.request_templates for select to authenticated
  using (public.is_active_user() and (shared or created_by = (select auth.uid())));

create policy "request_templates: alta propia"
  on public.request_templates for insert to authenticated
  with check (public.is_active_user() and created_by = (select auth.uid()));

create policy "request_templates: edita su creador o admin"
  on public.request_templates for update to authenticated
  using (public.is_admin() or (public.is_active_user() and created_by = (select auth.uid())))
  with check (public.is_admin() or created_by = (select auth.uid()));

create policy "request_templates: borra su creador o admin"
  on public.request_templates for delete to authenticated
  using (public.is_admin() or (public.is_active_user() and created_by = (select auth.uid())));

-- company_search_cache: lectura; escritura solo service_role.
create policy "company_search_cache: lectura para usuarios activos"
  on public.company_search_cache for select to authenticated
  using (public.is_active_user());

-- search_usage: cada uno ve lo suyo (los totales del equipo, por search_usage_stats).
create policy "search_usage: lectura propia o admin"
  on public.search_usage for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

revoke all on function public.shipment_requests_before_insert() from public, anon, authenticated;
revoke all on function public.shipment_requests_track_recipient() from public, anon, authenticated;
revoke all on function public.search_usage_stats() from public, anon;
grant execute on function public.search_usage_stats() to authenticated;
revoke all on function public.search_recipients(text, integer) from public, anon;
grant execute on function public.search_recipients(text, integer) to authenticated;
