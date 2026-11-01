"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { parseOffsets } from "@/lib/labels/layouts";
import { createClient } from "@/lib/supabase/server";

/** Calibración de la impresora (mm). Solo admin: es global para la oficina. */
export async function saveLabelOffsets(input: { top: number; left: number }) {
  await requireAdmin();
  const offsets = parseOffsets(input);
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").update({ label_offsets: offsets }).eq("id", true);
  if (error) return { ok: false as const, message: "No se pudo guardar la calibración." };
  revalidatePath("/etiquetas");
  return { ok: true as const, offsets };
}
