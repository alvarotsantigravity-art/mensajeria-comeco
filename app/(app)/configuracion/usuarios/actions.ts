"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowedEmail } from "@/lib/env";
import { createUserSchema, type FormState } from "@/lib/validation/auth";

const PATH = "/configuracion/usuarios";
// Supabase has no "disable" flag; a very long ban is the documented way.
const BAN_FOREVER = "876000h";

function tempPassword() {
  return randomBytes(9).toString("base64url"); // 12 chars
}

export async function createUser(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = createUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { email, full_name } = parsed.data;

  if (!isAllowedEmail(email)) {
    return { errors: { email: ["Solo se admiten cuentas @comecografico.com."] } };
  }

  const password = tempPassword();
  const { error } = await createAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, must_change_password: true },
  });

  if (error) {
    return {
      message: error.code === "email_exists" ? "Ya existe un usuario con ese email." : `No se pudo crear: ${error.message}`,
    };
  }

  revalidatePath(PATH);
  return { ok: true, message: `Usuario ${email} creado.`, tempPassword: password };
}

const idSchema = z.uuid();

export async function resetPassword(userId: string): Promise<FormState> {
  await requireAdmin();
  const id = idSchema.parse(userId);

  const admin = createAdminClient();
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) return { message: "No se pudo restablecer la contraseña." };

  await admin.from("profiles").update({ must_change_password: true }).eq("id", id);
  revalidatePath(PATH);
  return { ok: true, message: "Contraseña restablecida.", tempPassword: password };
}

export async function setUserActive(userId: string, active: boolean): Promise<FormState> {
  const me = await requireAdmin();
  const id = idSchema.parse(userId);
  if (id === me.id) return { message: "No puedes desactivar tu propia cuenta." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: active ? "none" : BAN_FOREVER,
  });
  if (error) return { message: "No se pudo cambiar el estado del usuario." };

  await admin.from("profiles").update({ active }).eq("id", id);
  revalidatePath(PATH);
  return { ok: true, message: active ? "Usuario activado." : "Usuario desactivado." };
}
