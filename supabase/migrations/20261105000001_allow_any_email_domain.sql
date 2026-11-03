-- Alta de usuarios de cualquier dominio de email: se quita la comprobación
-- de app_settings.allowed_domains. El resto de handle_new_user no cambia.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.app_settings;
begin
  select * into settings from public.app_settings where id;

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

revoke all on function public.handle_new_user() from public, anon, authenticated;
