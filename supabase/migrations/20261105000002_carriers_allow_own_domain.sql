-- Se permiten correos @comecografico.com en Para/CC de los proveedores.

alter table public.carriers drop constraint carriers_no_own_domain;
