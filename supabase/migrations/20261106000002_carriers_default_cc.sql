-- Copia por defecto en los correos a todos los proveedores (sin duplicar ni quitar los que ya tenían).

update public.carriers c
set email_cc = c.email_cc || array(
  select extra
  from unnest(array['atubio@comecografico.com', 'jjimenezm@vocento.com', 'emdefrutos@comecografico.com']) extra
  where extra not in (select lower(existing) from unnest(c.email_cc) existing)
);
