// Restablece la contraseña de una cuenta existente con una temporal nueva.
// Para cuando nadie puede entrar (p. ej. el admin la ha olvidado).
// Uso: npm run reset-password -- atubio@comecografico.com
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Uso: npm run reset-password -- <email>");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile, error: findError } = await supabase
  .from("profiles")
  .select("id, email, active")
  .ilike("email", email.trim())
  .maybeSingle();

if (findError || !profile) {
  console.error(`No existe ninguna cuenta con el email ${email}.`);
  process.exit(1);
}

const password = randomBytes(9).toString("base64url"); // 12 caracteres
const { error } = await supabase.auth.admin.updateUserById(profile.id, { password });
if (error) {
  console.error(`No se pudo restablecer: ${error.message}`);
  process.exit(1);
}

// Obliga a cambiarla al entrar y reactiva la cuenta si estaba desactivada.
await supabase.from("profiles").update({ must_change_password: true, active: true }).eq("id", profile.id);

console.log(`Contraseña restablecida: ${profile.email}`);
console.log(`Contraseña temporal (se pedirá cambiarla al entrar): ${password}`);
