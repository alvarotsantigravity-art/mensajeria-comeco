// Crea la cuenta del administrador inicial con una contraseña temporal.
// Uso: npm run create-admin -- atubio@comecografico.com "Nombre Apellido"
// Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const [email = "atubio@comecografico.com", fullName = ""] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const password = randomBytes(9).toString("base64url"); // 12 caracteres

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName, must_change_password: true },
});

if (error) {
  console.error(`No se pudo crear ${email}: ${error.message}`);
  process.exit(1);
}

console.log(`Usuario creado: ${data.user.email}`);
console.log(`Contraseña temporal (se pedirá cambiarla al entrar): ${password}`);
