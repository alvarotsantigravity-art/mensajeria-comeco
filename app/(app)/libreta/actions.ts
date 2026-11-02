"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { recipientSchema, type RecipientFormValues } from "@/lib/recipients/schema";
import type { RecipientRow } from "@/lib/recipients/data";

const PATH = "/libreta";
const idSchema = z.uuid();
const nullable = (value: string) => value.trim() || null;

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };
export type SaveRecipientResult =
  | { ok: true; id: string }
  | { ok: false; message: string; errors?: Record<string, string[] | undefined> };

export async function saveRecipient(input: { id: string | null; values: RecipientFormValues }): Promise<SaveRecipientResult> {
  await requireUser();
  const id = input.id === null ? null : idSchema.safeParse(input.id).data;
  if (id === undefined) return { ok: false, message: "Destinatario no válido." };

  const parsed = recipientSchema.safeParse(input.values);
  if (!parsed.success) {
    return { ok: false, message: "Revisa los campos marcados.", errors: z.flattenError(parsed.error).fieldErrors };
  }
  const v = parsed.data;
  const row = {
    company_name: v.company_name,
    address: nullable(v.address),
    postal_code: nullable(v.postal_code),
    city: nullable(v.city),
    province: nullable(v.province),
    country: v.country,
    contact_person: nullable(v.contact_person),
    phone: nullable(v.phone),
    email: nullable(v.email),
    notes: nullable(v.notes),
    source_url: nullable(v.source_url),
    verified_at: v.verified_at ? `${v.verified_at}T12:00:00Z` : null,
    is_favorite: v.is_favorite,
  };

  const supabase = await createClient();
  const result = id
    ? await supabase.from("recipients").update(row).eq("id", id).select("id").maybeSingle()
    : await supabase.from("recipients").insert(row).select("id").single();
  if (result.error || !result.data) {
    console.error("saveRecipient", result.error?.message);
    return { ok: false, message: "No se pudo guardar el destinatario." };
  }
  revalidatePath(PATH);
  return { ok: true, id: result.data.id };
}

export async function setFavorite(id: string, favorite: boolean): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("recipients").update({ is_favorite: favorite }).eq("id", idSchema.parse(id));
  if (error) return { ok: false, message: "No se pudo actualizar." };
  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteRecipient(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipients").delete().eq("id", idSchema.parse(id)).select("id");
  if (error) return { ok: false, message: "No se pudo borrar." };
  if (!data.length) return { ok: false, message: "Solo puede borrarlo quien lo creó o un administrador." };
  revalidatePath(PATH);
  return { ok: true, message: "Destinatario borrado." };
}

export async function mergeRecipients(keepId: string, dropId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("merge_recipients", {
    keep_id: idSchema.parse(keepId),
    drop_id: idSchema.parse(dropId),
  });
  if (error) {
    console.error("mergeRecipients", error.message);
    return { ok: false, message: "No se pudieron fusionar." };
  }
  revalidatePath(PATH);
  return { ok: true, message: "Destinatarios fusionados." };
}

export type RecipientOption = Pick<
  RecipientRow,
  "id" | "company_name" | "address" | "postal_code" | "city" | "province" | "country" | "contact_person" | "phone" | "is_favorite" | "usage_count" | "carrier_codes"
>;

/** Autocompletado del campo "Destinatario" en el formulario. */
export async function findRecipients(q: string): Promise<RecipientOption[]> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_recipients", { q: z.string().max(100).catch("").parse(q).trim(), max_results: 8 });
  return (data ?? []).map((r) => ({
    id: r.id,
    company_name: r.company_name,
    address: r.address,
    postal_code: r.postal_code,
    city: r.city,
    province: r.province,
    country: r.country,
    contact_person: r.contact_person,
    phone: r.phone,
    is_favorite: r.is_favorite,
    usage_count: r.usage_count,
    carrier_codes: r.carrier_codes,
  }));
}
