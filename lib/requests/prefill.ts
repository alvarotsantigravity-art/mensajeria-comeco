import type { Database } from "@/lib/supabase/database.types";
import type { RequestFormValues } from "./schema";

export type RecipientFields = Pick<
  Database["public"]["Tables"]["recipients"]["Row"],
  "id" | "company_name" | "address" | "postal_code" | "city" | "province" | "country" | "contact_person" | "phone"
> & { carrier_codes?: unknown };

/** Código de la dirección en un proveedor (p. ej. BOYACA 178), si lo hay. */
export function carrierCode(r: RecipientFields, carrier: string): string {
  const codes = r.carrier_codes && typeof r.carrier_codes === "object" ? (r.carrier_codes as Record<string, unknown>) : {};
  const code = codes[carrier];
  return typeof code === "string" ? code : "";
}

/** Rellena el bloque de recogida (transporte) con una dirección de la libreta. */
export function withPickup(values: RequestFormValues, r: RecipientFields): RequestFormValues {
  return {
    ...values,
    pickup_recipient_id: r.id,
    pickup_company: r.company_name,
    pickup_address: r.address ?? "",
    pickup_postal_code: r.postal_code ?? "",
    pickup_city: r.city ?? "",
    pickup_province: r.province ?? "",
    pickup_contact: r.contact_person ?? "",
    pickup_phone: r.phone ?? "",
    pickup_code: carrierCode(r, values.carrier),
  };
}

/** Rellena el bloque de destino con un destinatario de la libreta. */
export function withRecipient(values: RequestFormValues, r: RecipientFields): RequestFormValues {
  return {
    ...values,
    recipient_id: r.id,
    dest_company: r.company_name,
    dest_address: r.address ?? "",
    dest_postal_code: r.postal_code ?? "",
    dest_city: r.city ?? "",
    dest_province: r.province ?? "",
    dest_country: r.country,
    dest_contact: r.contact_person ?? "",
    dest_phone: r.phone ?? "",
    delivery_code: carrierCode(r, values.carrier),
    save_recipient: false,
  };
}
