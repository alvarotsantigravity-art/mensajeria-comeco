-- Albaranes de entrega (modelo docs/ALBARAN COMECO.pdf, sin logotipo).
-- Uno por solicitud: el Nº Albarán es la referencia de la solicitud. Sin valorar.
-- Todo es aditivo: el código anterior sigue funcionando.

-- ---------------------------------------------------------------------------
-- Datos legales de la cabecera y del pie (editables por el admin)
-- ---------------------------------------------------------------------------
alter table public.app_settings
  add column legal_name    text not null default 'COMECO INTEGRA S.L.U.',
  add column legal_address text not null default 'C/ Meridiano, 19 · 28850 Torrejón de Ardoz',
  add column legal_tax_id  text not null default 'B87584793',
  add column delivery_note_waste text not null default
    'Los residuos derivados de los embalajes de los productos suministrados, (Flejes, film plástico y cartón), son residuos no peligrosos y deberán gestionarse por ustedes de manera adecuada, mediante su depósito en los contenedores municipales convenientemente segregados, o bien mediante su entrega a gestor autorizado para su reciclado. No obstante, antes de considerar estos materiales como residuos, considere la posibilidad de reutilizarlos internamente. El responsable de la entrega del residuo del envase o envase usado, para su gestión ambiental, será su poseedor final.',
  add column delivery_note_legal text not null default
    E'Sólo los productos que se identifican como tal son PEFC Certificado: Nº Certificado BMC-PEFC-COC-00237\nSólo los productos que se identifican como tal son certificados FSC®. Nº Certificado BMC-COC-007865\nNº Registro de Productores de Producto (RD 1055/2022): ENV/2023/000029862';

-- ---------------------------------------------------------------------------
-- delivery_notes
-- ---------------------------------------------------------------------------
create table public.delivery_notes (
  request_id           uuid primary key references public.shipment_requests (id) on delete cascade,
  order_number         text,
  delivery_date        date,
  origin               text,
  transport_mode       text,
  comment              text,
  quantity             numeric(14, 2) check (quantity >= 0),
  unit                 text not null default 'ej.' check (unit in ('ej.', 'cajas', 'kg')),
  concept              text,
  units_per_package    integer check (units_per_package > 0),
  packages             integer check (packages >= 0),
  packages_per_pallet  integer check (packages_per_pallet > 0),
  pallets              integer check (pallets >= 0),
  created_by           uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger delivery_notes_updated_at
  before update on public.delivery_notes
  for each row execute function public.set_updated_at();

alter table public.delivery_notes enable row level security;

-- Todos leen (como el historial); lo guarda quien puede editar la solicitud.
create policy "delivery_notes: lectura para usuarios activos"
  on public.delivery_notes for select to authenticated
  using (public.is_active_user());

create policy "delivery_notes: alta de quien edita la solicitud"
  on public.delivery_notes for insert to authenticated
  with check (
    public.is_active_user() and exists (
      select 1 from public.shipment_requests r
      where r.id = request_id and (r.requester_id = (select auth.uid()) or public.is_admin())
    )
  );

create policy "delivery_notes: edición de quien edita la solicitud"
  on public.delivery_notes for update to authenticated
  using (
    public.is_active_user() and exists (
      select 1 from public.shipment_requests r
      where r.id = request_id and (r.requester_id = (select auth.uid()) or public.is_admin())
    )
  );
