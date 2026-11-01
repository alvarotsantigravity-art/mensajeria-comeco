-- Fase 5 · Fusionar duplicados de la libreta (§5.5).
-- Reasigna las solicitudes al destinatario que se conserva, suma las estadísticas,
-- completa los campos vacíos con los del duplicado y borra el duplicado.
-- Cualquier usuario activo puede fusionar: no se pierde ningún dato (la libreta es
-- compartida), a diferencia de un borrado, que sigue reservado al creador o a un admin.
-- SECURITY DEFINER porque las solicitudes de otros compañeros no son editables por RLS.

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
    updated_by     = coalesce((select auth.uid()), kept.updated_by)
  where id = keep_id
  returning * into kept;

  delete from public.recipients where id = drop_id;
  return kept;
end;
$$;

revoke all on function public.merge_recipients(uuid, uuid) from public, anon;
grant execute on function public.merge_recipients(uuid, uuid) to authenticated;
