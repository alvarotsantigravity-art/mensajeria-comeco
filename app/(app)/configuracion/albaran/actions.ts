"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type LegalFormState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> };

const legalSchema = z.object({
  legal_name: z.string().trim().min(1, "Indica la razón social.").max(120),
  legal_address: z.string().trim().min(1, "Indica la dirección.").max(200),
  legal_tax_id: z.string().trim().regex(/^[A-Z0-9]{8,12}$/i, "N.I.F. no válido."),
  delivery_note_waste: z.string().trim().max(1500),
  delivery_note_legal: z.string().trim().max(1000),
});

/** Datos legales de la cabecera y del pie del albarán. Solo admin (RLS de app_settings). */
export async function saveLegalData(_prev: LegalFormState, formData: FormData): Promise<LegalFormState> {
  await requireAdmin();
  const parsed = legalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Revisa los campos marcados.", errors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update({ ...parsed.data, legal_tax_id: parsed.data.legal_tax_id.toUpperCase() })
    .eq("id", true);
  if (error) return { message: "No se pudieron guardar los datos." };

  revalidatePath("/configuracion/albaran");
  revalidatePath("/albaranes");
  return { ok: true, message: "Datos del albarán guardados." };
}
