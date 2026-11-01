import type { Database } from "@/lib/supabase/database.types";
import type { RequestFormValues } from "./schema";

export type RecipientFields = Pick<
  Database["public"]["Tables"]["recipients"]["Row"],
  "id" | "company_name" | "address" | "postal_code" | "city" | "province" | "country" | "contact_person" | "phone"
>;

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
    save_recipient: false,
  };
}
