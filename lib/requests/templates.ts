import "server-only";
import { createClient } from "@/lib/supabase/server";
import { draftSchema, type RequestFormValues } from "./schema";

// Plantillas de envíos frecuentes (§5.5): guardan la petición, el destino y el
// servicio; nunca el solicitante ni la fecha, que salen de quien la usa.

export const TEMPLATE_FIELDS = [
  "concept",
  "description",
  "shipment_type",
  "envelope_count",
  "box_count",
  "recipient_id",
  "dest_company",
  "dest_address",
  "dest_postal_code",
  "dest_city",
  "dest_province",
  "dest_country",
  "dest_contact",
  "dest_phone",
  "urgency",
  "scope",
  "transport",
  "email_cc",
  // Transporte (sin fechas: son de cada envío)
  "carrier",
  "op",
  "product",
  "pickup_recipient_id",
  "pickup_code",
  "pickup_company",
  "pickup_address",
  "pickup_postal_code",
  "pickup_city",
  "pickup_province",
  "pickup_contact",
  "pickup_phone",
  "pickup_time",
  "pickup_notes",
  "delivery_code",
  "delivery_time",
  "delivery_notes",
  "pallets",
  "weight_kg",
  "carrier_service",
  "observations",
] as const satisfies readonly (keyof RequestFormValues)[];

const payloadSchema = draftSchema.pick(Object.fromEntries(TEMPLATE_FIELDS.map((k) => [k, true])) as { [K in (typeof TEMPLATE_FIELDS)[number]]: true }).partial();

export type TemplatePayload = Partial<Pick<RequestFormValues, (typeof TEMPLATE_FIELDS)[number]>>;

export function pickTemplatePayload(values: RequestFormValues): TemplatePayload {
  return Object.fromEntries(TEMPLATE_FIELDS.map((k) => [k, values[k]])) as TemplatePayload;
}

/** Valores del formulario a partir de una plantilla; ignora claves desconocidas o inválidas. */
export function applyTemplate(base: RequestFormValues, payload: unknown): RequestFormValues {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return base;
  const values = { ...base, ...parsed.data } as RequestFormValues;
  return { ...values, save_recipient: values.recipient_id === null };
}

export type TemplateSummary = { id: string; name: string; created_by: string; shared: boolean };

export async function listTemplates(): Promise<TemplateSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("request_templates").select("id, name, created_by, shared").order("name");
  return data ?? [];
}

export async function getTemplatePayload(id: string): Promise<unknown | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("request_templates").select("payload").eq("id", id).maybeSingle();
  return data?.payload ?? null;
}
