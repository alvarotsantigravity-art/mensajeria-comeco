-- Proveedores de transporte: cada uno con su formulario, sus correos y su prefijo.
-- Todo es aditivo: las solicitudes existentes pasan a "Mensajería interna" (MSJ) y
-- siguen con su numeración; el código anterior a esta migración sigue funcionando.

-- ---------------------------------------------------------------------------
-- carriers
-- ---------------------------------------------------------------------------
create table public.carriers (
  slug              text primary key check (slug ~ '^[a-z0-9-]{2,30}$'),
  name              text not null check (length(trim(name)) > 0),
  -- Formulario: el de mensajería de siempre o el de transporte (recogida + entrega + palés).
  form_kind         text not null default 'transporte' check (form_kind in ('mensajeria', 'transporte')),
  -- Correo: plantilla de mensajería, tabla de transporte (BOYACA, TIPSA) o lista corta (RAFA VENTO).
  email_layout      text not null default 'tabla' check (email_layout in ('mensajeria', 'tabla', 'lista')),
  ref_prefix        text not null unique check (ref_prefix ~ '^[A-Z]{2,5}$'),
  email_to          text[] not null check (cardinality(email_to) between 1 and 10),
  email_cc          text[] not null default '{}' check (cardinality(email_cc) <= 20),
  subject_template  text not null check (length(trim(subject_template)) > 0),
  email_intro       text not null default '',
  greeting_name     text not null default '',
  customer_code     text not null default '',
  service_options   text[] not null default '{}',
  uses_codes        boolean not null default false,
  active            boolean not null default true,
  sort_order        integer not null default 0,
  updated_at        timestamptz not null default now(),
  -- Nunca correos propios en Para/CC del proveedor.
  constraint carriers_no_own_domain
    check (array_to_string(email_to || email_cc, ',') !~* '@comecografico\.com')
);

create trigger carriers_updated_at
  before update on public.carriers
  for each row execute function public.set_updated_at();

alter table public.carriers enable row level security;

create policy "carriers: lectura para usuarios activos"
  on public.carriers for select to authenticated
  using (public.is_active_user());

create policy "carriers: alta solo admin"
  on public.carriers for insert to authenticated
  with check (public.is_admin());

create policy "carriers: edición solo admin"
  on public.carriers for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- La mensajería interna hereda Para/CC/asunto de la configuración actual.
insert into public.carriers
  (slug, name, form_kind, email_layout, ref_prefix, email_to, email_cc, subject_template, sort_order)
select 'mensajeria', 'Mensajería interna', 'mensajeria', 'mensajeria', 'MSJ',
       s.courier_to,
       array(select c from unnest(s.courier_cc) c where c !~* '@comecografico\.com'),
       s.subject_template, 0
from public.app_settings s
where s.id;

insert into public.carriers
  (slug, name, form_kind, email_layout, ref_prefix, email_to, email_cc, subject_template,
   email_intro, greeting_name, customer_code, service_options, uses_codes, sort_order)
values
  ('boyaca', 'BOYACA', 'transporte', 'tabla', 'BOY',
   array['editorial@boyaca.es', 'cperez@boyaca.es'], '{}',
   'SOLICITUD DE TRANSPORTE {op} {producto} {origen} {dia_recogida}[ a las {hora_recogida} h] a CARGA EN {origen} - Y ENTREGA DIRECTA {destino}',
   'Necesitamos transporte para', '', '', '{}', true, 10),
  ('rafa-vento', 'RAFA VENTO', 'transporte', 'lista', 'RVE',
   array['transportes.vr.mad@gmail.com'], array['jeelvira@comecodistribucion.com'],
   'SOLICITUD DE TRANSPORTE {op} {producto} {origen} {dia_recogida}[ a las {hora_recogida} h] a CARGA EN {origen} - Y ENTREGA DIRECTA {destino}',
   'Solicitud de transporte', 'Rafa', '', '{}', false, 20),
  ('tipsa', 'TIPSA', 'transporte', 'tabla', 'TIP',
   array['nacional17.madrid@tip-sa.com'],
   array['fjperez@comecodistribucion.com', 'jjimenezm@vocento.com', 'nacional.madrid@tip-sa.com',
         'jeelvira@comecodistribucion.com', 'informatica.ficheros@tip-sa.com', 'antonio.almacen@tip-sa.com'],
   'SOLICITUD DE SERVICIO RECOGIDA {recogida_dm} EN {origen_completo} // ENTREGA {entrega_dm} EN {destino_completo}',
   'Necesitamos el siguiente servicio con TIPSA', '', '09211',
   array['TIPSA 10 H (Urgente)', 'TIPSA 14 H'], false, 30);

-- ---------------------------------------------------------------------------
-- shipment_requests: proveedor y datos de transporte (todos opcionales)
-- ---------------------------------------------------------------------------
alter table public.shipment_requests
  add column carrier          text not null default 'mensajeria'
                                references public.carriers (slug) on update cascade,
  add column op               text,
  add column product          text,
  add column pickup_recipient_id uuid references public.recipients (id) on delete set null,
  add column pickup_code      text,
  add column pickup_company   text,
  add column pickup_address   text,
  add column pickup_postal_code text,
  add column pickup_city      text,
  add column pickup_province  text,
  add column pickup_contact   text,
  add column pickup_phone     text,
  add column pickup_date      date,
  add column pickup_time      text,
  add column pickup_notes     text,
  add column delivery_code    text,
  add column delivery_date    date,
  add column delivery_time    text,
  add column delivery_notes   text,
  add column pallets          text,
  add column weight_kg        text,
  add column carrier_service  text,
  add column observations     text;

create index shipment_requests_carrier on public.shipment_requests (carrier, request_date desc);
create index shipment_requests_pickup_recipient on public.shipment_requests (pickup_recipient_id);

-- ---------------------------------------------------------------------------
-- recipients: código de cada dirección en cada proveedor (p. ej. BOYACA 178)
-- ---------------------------------------------------------------------------
alter table public.recipients
  add column carrier_codes jsonb not null default '{}'::jsonb
    check (jsonb_typeof(carrier_codes) = 'object');

-- Origen habitual de BOYACA: Rotomadrid, código de recogida 178.
do $$
declare
  found_id uuid;
begin
  select id into found_id
  from public.recipients
  where lower(public.f_unaccent(company_name)) like 'rotomadrid%'
  order by usage_count desc
  limit 1;

  if found_id is null then
    insert into public.recipients
      (company_name, address, postal_code, city, province, country, phone, carrier_codes, created_by, updated_by)
    values
      ('Rotomadrid S.L.', 'Calle Meridiano 19', '28850', 'Torrejón de Ardoz', 'Madrid', 'España',
       '916 76 75 04', '{"boyaca": "178"}', null, null);
  else
    update public.recipients
    set carrier_codes = carrier_codes || '{"boyaca": "178"}'
    where id = found_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Referencias con prefijo por proveedor: MSJ-2026-0001, BOY-2026-0001…
-- Los contadores existentes son de MSJ y conservan su número.
-- ---------------------------------------------------------------------------
alter table public.shipment_ref_counters add column prefix text not null default 'MSJ';
alter table public.shipment_ref_counters drop constraint shipment_ref_counters_pkey;
alter table public.shipment_ref_counters add primary key (prefix, year);

create or replace function public.next_shipment_ref(carrier_slug text, ref_date date)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ref_prefix text;
  ref_year integer := extract(year from ref_date)::integer;
  next_value integer;
begin
  select c.ref_prefix into ref_prefix from public.carriers c where c.slug = carrier_slug;
  ref_prefix := coalesce(ref_prefix, 'MSJ');

  insert into public.shipment_ref_counters as c (prefix, year, last)
  values (ref_prefix, ref_year, 1)
  on conflict (prefix, year) do update set last = c.last + 1
  returning last into next_value;

  return format('%s-%s-%s', ref_prefix, ref_year, lpad(next_value::text, 4, '0'));
end;
$$;

revoke all on function public.next_shipment_ref(text, date) from public, anon, authenticated;

create or replace function public.shipment_requests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.ref := public.next_shipment_ref(new.carrier, new.request_date);
  if new.status = 'enviada' and new.sent_at is null then
    new.sent_at := now();
  end if;
  return new;
end;
$$;

-- Un borrador que cambia de proveedor recibe una referencia nueva con su prefijo.
create or replace function public.shipment_requests_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.created_at := old.created_at;
  if new.carrier is distinct from old.carrier and old.status = 'borrador' then
    new.ref := public.next_shipment_ref(new.carrier, new.request_date);
  else
    new.carrier := old.carrier;
    new.ref := old.ref;
  end if;
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

-- ---------------------------------------------------------------------------
-- Fusionar destinatarios: también sus códigos de proveedor y las recogidas.
-- ---------------------------------------------------------------------------
create or replace function public.merge_recipients(keep_id uuid, drop_id uuid)
returns public.recipients
language plpgsql
security definer
set search_path = ''
as $$
declare
  kept public.recipients;
  dup  public.recipients;
begin
  if not public.is_active_user() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if keep_id is null or drop_id is null or keep_id = drop_id then
    raise exception 'Elige dos destinatarios distintos' using errcode = '22023';
  end if;

  select * into kept from public.recipients where id = keep_id for update;
  select * into dup from public.recipients where id = drop_id for update;
  if kept.id is null or dup.id is null then
    raise exception 'Destinatario no encontrado' using errcode = 'P0002';
  end if;

  update public.shipment_requests set recipient_id = keep_id where recipient_id = drop_id;
  update public.shipment_requests set pickup_recipient_id = keep_id where pickup_recipient_id = drop_id;

  update public.recipients set
    address        = coalesce(nullif(trim(kept.address), ''), dup.address),
    postal_code    = coalesce(nullif(trim(kept.postal_code), ''), dup.postal_code),
    city           = coalesce(nullif(trim(kept.city), ''), dup.city),
    province       = coalesce(nullif(trim(kept.province), ''), dup.province),
    contact_person = coalesce(nullif(trim(kept.contact_person), ''), dup.contact_person),
    phone          = coalesce(nullif(trim(kept.phone), ''), dup.phone),
    email          = coalesce(nullif(trim(kept.email), ''), dup.email),
    notes          = concat_ws(E'\n', nullif(trim(kept.notes), ''), nullif(trim(dup.notes), '')),
    source_url     = coalesce(nullif(trim(kept.source_url), ''), dup.source_url),
    verified_at    = greatest(kept.verified_at, dup.verified_at),
    is_favorite    = kept.is_favorite or dup.is_favorite,
    usage_count    = kept.usage_count + dup.usage_count,
    last_used_at   = greatest(kept.last_used_at, dup.last_used_at),
    carrier_codes  = dup.carrier_codes || kept.carrier_codes,
    updated_by     = coalesce((select auth.uid()), kept.updated_by)
  where id = keep_id
  returning * into kept;

  delete from public.recipients where id = drop_id;
  return kept;
end;
$$;

revoke all on function public.merge_recipients(uuid, uuid) from public, anon;
grant execute on function public.merge_recipients(uuid, uuid) to authenticated;
