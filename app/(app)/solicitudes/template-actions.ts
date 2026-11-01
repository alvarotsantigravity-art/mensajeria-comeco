"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { draftSchema, type RequestFormValues } from "@/lib/requests/schema";
import { pickTemplatePayload } from "@/lib/requests/templates";

const nameSchema = z.string().trim().min(1, "Ponle un nombre.").max(80, "Máximo 80 caracteres.");

export async function saveTemplate(name: string, values: RequestFormValues): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const parsedName = nameSchema.safeParse(name);
  if (!parsedName.success) return { ok: false, message: parsedName.error.issues[0].message };
  const draft = draftSchema.safeParse(values);
  if (!draft.success) return { ok: false, message: "Hay datos con un formato no válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("request_templates")
    .insert({ name: parsedName.data, payload: pickTemplatePayload(values), shared: true });
  if (error) {
    console.error("saveTemplate", error.message);
    return { ok: false, message: "No se pudo guardar la plantilla." };
  }
  revalidatePath("/solicitudes/nueva");
  return { ok: true, message: `Plantilla «${parsedName.data}» guardada.` };
}

export async function deleteTemplate(id: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("request_templates").delete().eq("id", z.uuid().parse(id)).select("id");
  if (error || !data.length) return { ok: false, message: "Solo puede borrarla quien la creó o un administrador." };
  revalidatePath("/solicitudes/nueva");
  return { ok: true, message: "Plantilla borrada." };
}
