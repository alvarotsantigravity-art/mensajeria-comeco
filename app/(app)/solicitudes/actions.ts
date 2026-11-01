"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { buildEmailBody, buildSubject } from "@/lib/email/build-body";
import { getSettings, todayInMadrid } from "@/lib/requests/data";
import type { Status } from "@/lib/requests/options";
import { draftSchema, parseEmailList, requestSchema, type RequestFormValues } from "@/lib/requests/schema";

export type SaveRequestResult =
  | { ok: true; id: string; ref: string; status: Status; recipientId: string | null }
  | { ok: false; message: string; errors?: Record<string, string[] | undefined> };

const inputSchema = z.object({
  id: z.uuid().nullish(),
  send: z.boolean().optional(),
});

type Values = z.output<typeof draftSchema>;

const nullable = (value: string) => value.trim() || null;

function toRow(v: Values) {
  return {
    request_date: v.request_date || todayInMadrid(),
    requester_name: v.requester_name,
    requester_phone: nullable(v.requester_phone),
    requester_email: nullable(v.requester_email),
    company: v.company,
    ceco: v.ceco,
    concept: nullable(v.concept),
    description: nullable(v.description),
    shipment_type: v.shipment_type || null,
    box_count: v.shipment_type === "caja" && v.box_count ? Number.parseInt(v.box_count, 10) || null : null,
    recipient_id: v.recipient_id,
    dest_company: nullable(v.dest_company),
    dest_address: nullable(v.dest_address),
    dest_postal_code: nullable(v.dest_postal_code),
    dest_city: nullable(v.dest_city),
    dest_province: nullable(v.dest_province),
    dest_country: v.dest_country.trim() || "España",
    dest_contact: nullable(v.dest_contact),
    dest_phone: nullable(v.dest_phone),
    urgency: v.urgency || null,
    scope: v.scope || null,
    transport: v.transport || null,
    email_cc: parseEmailList(v.email_cc),
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Crea o actualiza el destinatario en la libreta. Si falla, el envío sigue adelante. */
async function upsertRecipient(supabase: Supabase, v: Values): Promise<string | null> {
  const fields = {
    company_name: v.dest_company.trim(),
    address: nullable(v.dest_address),
    postal_code: nullable(v.dest_postal_code),
    city: nullable(v.dest_city),
    province: nullable(v.dest_province),
    country: v.dest_country.trim() || "España",
    contact_person: nullable(v.dest_contact),
    phone: nullable(v.dest_phone),
  };

  if (v.recipient_id) {
    const { data } = await supabase.from("recipients").update(fields).eq("id", v.recipient_id).select("id").maybeSingle();
    if (data) return data.id;
  }
  const { data, error } = await supabase.from("recipients").insert(fields).select("id").single();
  if (error) console.error("No se pudo guardar el destinatario", error.message);
  return data?.id ?? v.recipient_id;
}

/**
 * Guarda la solicitud. Sin `send` es un borrador (autoguardado, sin obligatorios).
 * Con `send` valida la solicitud completa, guarda el correo generado y la marca como enviada.
 */
export async function saveRequest(input: {
  id?: string | null;
  values: RequestFormValues;
  send?: boolean;
}): Promise<SaveRequestResult> {
  await requireUser();

  const meta = inputSchema.safeParse(input);
  if (!meta.success) return { ok: false, message: "Solicitud no válida." };
  const { id, send } = meta.data;

  const draft = draftSchema.safeParse(input.values);
  if (!draft.success) return { ok: false, message: "Hay datos con un formato no válido." };
  const values = draft.data;

  const supabase = await createClient();
  let row: ReturnType<typeof toRow> & {
    status?: Status;
    email_subject?: string;
    email_body?: string;
  } = toRow(values);

  if (send) {
    const full = requestSchema.safeParse(input.values);
    if (!full.success) {
      return { ok: false, message: "Revisa los campos marcados.", errors: z.flattenError(full.error).fieldErrors };
    }
    const settings = await getSettings();
    const recipientId = values.save_recipient ? await upsertRecipient(supabase, values) : values.recipient_id;
    row = {
      ...row,
      recipient_id: recipientId,
      status: "enviada",
      email_subject: buildSubject(settings.subject_template, input.values),
      email_body: buildEmailBody(input.values),
    };
  }

  const columns = "id, ref, status, recipient_id";
  const result = id
    ? await supabase.from("shipment_requests").update(row).eq("id", id).select(columns).maybeSingle()
    : await supabase.from("shipment_requests").insert(row).select(columns).single();

  if (result.error) {
    console.error("saveRequest", result.error.message);
    return { ok: false, message: "No se pudo guardar la solicitud." };
  }
  if (!result.data) return { ok: false, message: "No puedes editar esta solicitud." };

  const saved = result.data;
  return {
    ok: true,
    id: saved.id,
    ref: saved.ref,
    status: saved.status as Status,
    recipientId: saved.recipient_id,
  };
}
