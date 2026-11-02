"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { noteSchema, noteToRow, type NoteValues } from "@/lib/delivery-notes/note";
import { createClient } from "@/lib/supabase/server";

export type SaveNoteResult = { ok: true } | { ok: false; message: string; errors?: Record<string, string[] | undefined> };

/** Guarda el albarán de una solicitud (lo puede guardar su autor o un admin: RLS). */
export async function saveDeliveryNote(requestId: string, values: NoteValues): Promise<SaveNoteResult> {
  await requireUser();
  const id = z.uuid().safeParse(requestId);
  if (!id.success) return { ok: false, message: "Solicitud no válida." };
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) return { ok: false, message: "Revisa los campos marcados.", errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_notes")
    .upsert({ request_id: id.data, ...noteToRow(parsed.data) }, { onConflict: "request_id" })
    .select("request_id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("saveDeliveryNote", error.message);
    return { ok: false, message: "No se pudo guardar: solo su autor o un administrador puede cambiar este albarán." };
  }
  revalidatePath("/albaranes");
  return { ok: true };
}
