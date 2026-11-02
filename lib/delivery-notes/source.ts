import "server-only";
import { getCarrier } from "@/lib/carriers/data";
import { formatRequestDate } from "@/lib/email/build-body";
import { getRequest, getSettings, todayInMadrid, type AppSettings } from "@/lib/requests/data";
import { createClient } from "@/lib/supabase/server";
import { defaultNote, rowToNote, type NoteHeader, type NoteValues } from "./note";

export type DeliveryNoteSource = {
  requestId: string;
  title: string;
  /** Quien puede guardarlo: el autor de la solicitud o un admin. */
  requesterId: string;
  header: NoteHeader;
  values: NoteValues;
  saved: boolean;
};

export function legalFromSettings(s: AppSettings): NoteHeader["legal"] {
  return {
    name: s.legal_name,
    address: s.legal_address,
    taxId: s.legal_tax_id,
    waste: s.delivery_note_waste,
    footer: s.delivery_note_legal,
  };
}

/** Albarán de una solicitud: el guardado o, si no hay, uno relleno con sus datos. */
export async function getDeliveryNote(requestId: string): Promise<DeliveryNoteSource | null> {
  const r = await getRequest(requestId);
  if (!r) return null;
  const supabase = await createClient();
  const [settings, carrier, { data: row }] = await Promise.all([
    getSettings(),
    getCarrier(r.carrier),
    supabase.from("delivery_notes").select("*").eq("request_id", r.id).maybeSingle(),
  ]);

  const values = row
    ? rowToNote(row)
    : defaultNote({
        op: r.op,
        product: r.product,
        concept: r.concept,
        description: r.description,
        observations: r.observations,
        carrierName: carrier?.name ?? r.carrier,
        pickupCompany: r.pickup_company,
        officeName: settings.sender_name,
        deliveryDate: r.delivery_date,
        requestDate: r.request_date,
        pallets: r.pallets,
        boxCount: r.shipment_type === "caja" ? r.box_count : null,
      });

  const region = r.dest_province && r.dest_province.trim().toLowerCase() !== (r.dest_city ?? "").trim().toLowerCase() ? ` (${r.dest_province})` : "";
  const foreign = r.dest_country && !/^espa[ñn]a$/i.test(r.dest_country.trim()) ? ` · ${r.dest_country}` : "";

  return {
    requestId: r.id,
    title: `${r.ref} · ${r.dest_company || "Sin destino"}`,
    requesterId: r.requester_id,
    header: {
      ref: r.ref,
      generated: formatRequestDate(todayInMadrid()),
      address: {
        company: r.dest_company ?? "",
        address: r.dest_address ?? "",
        place: [r.dest_postal_code, (r.dest_city ?? "").toUpperCase()].filter(Boolean).join(" ") + region + foreign,
      },
      legal: legalFromSettings(settings),
    },
    values,
    saved: Boolean(row),
  };
}
