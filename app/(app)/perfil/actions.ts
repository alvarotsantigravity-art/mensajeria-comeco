"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { profileSchema, type FormState } from "@/lib/validation/auth";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireUser();

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, phone: parsed.data.phone || null })
    .eq("id", profile.id);

  if (error) return { message: "No se pudo guardar el perfil." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil guardado." };
}
