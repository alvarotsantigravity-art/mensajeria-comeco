import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  company: string;
  default_ceco: string;
  role: "user" | "admin";
  active: boolean;
  must_change_password: boolean;
};

const PROFILE_COLUMNS =
  "id, email, full_name, phone, company, default_ceco, role, active, must_change_password";

/**
 * Data Access Layer: verifies the session against Supabase Auth and loads the
 * profile. Memoised per request. Redirects instead of returning null.
 */
const getProfile = cache(async (): Promise<Profile> => {
  // Always per-request, even before Supabase is configured (never prerender a redirect).
  await connection();
  if (!isSupabaseConfigured) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // La cookie parecía válida (el proxy dejó pasar) pero Supabase la rechaza: sesión
  // revocada o caducada. El proxy la borra al ver este aviso (si no, /login → / → /login…).
  if (!user) redirect("/login?sesion=caducada");

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single<Profile>();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/login?error=inactive");
  }
  return profile;
});

export async function requireUser(options: { allowPasswordChange?: boolean } = {}) {
  const profile = await getProfile();
  if (profile.must_change_password && !options.allowPasswordChange) {
    redirect("/cambiar-contrasena");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (profile.role !== "admin") redirect("/");
  return profile;
}
