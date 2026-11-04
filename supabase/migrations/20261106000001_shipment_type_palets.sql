-- Tipo de envío «palets» y nº de sobres para la documentación. El nº de palets va en
-- la columna pallets, que ya existe.

alter table public.shipment_requests drop constraint shipment_requests_shipment_type_check;
alter table public.shipment_requests
  add constraint shipment_requests_shipment_type_check
  check (shipment_type in ('documentacion', 'caja', 'palets'));

-- Sin obligatoriedad en BD: las documentaciones ya enviadas no tienen nº de sobres.
alter table public.shipment_requests
  add column envelope_count integer check (envelope_count >= 1);
