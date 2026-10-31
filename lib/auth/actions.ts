"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail, isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/auth/dal";
import { loginSchema, newPasswordSchema, type FormState } from "@/lib/validation/auth";

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured) {
    return { message: "Supabase aún no está configurado (.env.local)." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { email, password } = parsed.data;
  if (!isAllowedEmail(email)) {
    return { errors: { email: ["Solo se admiten cuentas @comecografico.com."] } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: "Email o contraseña incorrectos." };

  const next = String(formData.get("next") ?? "");
  // Only same-site relative paths, never "//evil.com".
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser({ allowPasswordChange: true });

  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      message:
        error.code === "same_password"
          ? "La nueva contraseña debe ser distinta de la temporal."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo.",
    };
  }

  // The user can't clear this flag through RLS; the server does it after a successful change.
  await createAdminClient()
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  redirect(profile.full_name && profile.phone ? "/" : "/perfil?bienvenida=1");
}
