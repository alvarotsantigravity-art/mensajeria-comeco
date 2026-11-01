-- Datos de desarrollo local (supabase db reset). No se aplica en producción.
-- app_settings ya se inserta en la migración con los valores reales de Comeco Gráfico.
-- Los usuarios se crean con: npm run create-admin
-- Destinatarios ficticios para probar el autocompletado (tildes y errores).

insert into public.recipients
  (company_name, address, postal_code, city, province, country, contact_person, phone, email, notes, is_favorite)
values
  ('Notaría Ejemplo Martínez', 'Calle de Alcalá, 100', '28009', 'Madrid', 'Madrid', 'España',
   'Lucía Gómez', '910 000 001', 'recepcion@notaria-ejemplo.test', 'Entregar en recepción, 2.ª planta', true),
  ('Imprenta Demo Bilbao', 'Gran Vía de Don Diego López de Haro, 1', '48001', 'Bilbao', 'Bizkaia', 'España',
   'Iñaki Etxeberria', '944 000 002', null, null, false),
  ('Distribuciones Prueba Valencia', 'Avinguda del Port, 50', '46023', 'València', 'Valencia', 'España',
   'Andrés Peña', '963 000 003', 'logistica@prueba-valencia.test', 'Horario de 9 a 14 h', false),
  ('Editorial Ficticia Lisboa', 'Rua Augusta, 10', '1100-053', 'Lisboa', null, 'Portugal',
   'João Silva', '+351 210 000 004', null, null, false);
