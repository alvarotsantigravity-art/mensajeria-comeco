import "server-only";
import { z } from "zod";
import { formatRequestDate } from "@/lib/email/build-body";
import { getCarrier } from "@/lib/carriers/data";
import { getRequest, getSettings } from "@/lib/requests/data";
import { getRecipient } from "@/lib/recipients/data";
import { parseOffsets, type LabelOffsets } from "./layouts";
import type { LabelSender, LabelSource } from "./label-data";

export type LabelTarget = { kind: "solicitud" | "destinatario"; id: string };

const uuid = z.uuid();

/** ?solicitud=<id> o ?destinatario=<id> (etiqueta suelta desde la libreta). */
export function parseTarget(params: Record<string, string | string[] | undefined>): LabelTarget | null {
  for (const kind of ["solicitud", "destinatario"] as const) {
    const raw = params[kind];
    const id = uuid.safeParse(Array.isArray(raw) ? raw[0] : raw);
    if (id.success) return { kind, id: id.data };
  }
  return null;
}

export async function getLabelSource(target: LabelTarget): Promise<(LabelSource & { title: string }) | null> {
  if (target.kind === "solicitud") {
    const r = await getRequest(target.id);
    if (!r) return null;
    const carrier = await getCarrier(r.carrier);
    const transport = carrier?.formKind === "transporte";
    // Remitente = origen de la carga (todos los proveedores). Transporte: una etiqueta por palé.
    const sender = r.pickup_company
      ? {
          sender: {
            name: r.pickup_company,
            address: r.pickup_address ?? "",
            postalCode: r.pickup_postal_code ?? "",
            city: r.pickup_city ?? "",
            province: r.pickup_province ?? "",
            phone: r.pickup_phone ?? "",
          },
        }
      : {};
    const pallets = Number.parseInt(r.pallets ?? "", 10);
    const transportExtras = transport
      ? {
          unit: "Palé",
          boxCount: Math.min(50, Math.max(1, Number.isFinite(pallets) ? pallets : 1)),
          documentation: false,
          urgent: /urgente/i.test(r.carrier_service ?? ""),
          defaultNotes: [r.op, r.product, r.delivery_code ? `Cód. entrega ${r.delivery_code}` : "", carrier?.name]
            .filter(Boolean)
            .join(" · ")
            .slice(0, 140),
        }
      : {};
    return {
      title: `${r.ref} · ${r.dest_company || "Sin destino"}`,
      recipient: {
        company: r.dest_company ?? "",
        contact: r.dest_contact ?? "",
        address: r.dest_address ?? "",
        postalCode: r.dest_postal_code ?? "",
        city: r.dest_city ?? "",
        province: r.dest_province ?? "",
        country: r.dest_country ?? "",
        phone: r.dest_phone ?? "",
      },
      ref: r.ref,
      date: formatRequestDate(r.request_date),
      qr: r.id,
      urgent: r.urgency === "urgente",
      documentation: r.shipment_type === "documentacion",
      boxCount: r.shipment_type === "caja" ? Math.max(1, r.box_count ?? 1) : 1,
      ...sender,
      ...transportExtras,
    };
  }

  const c = await getRecipient(target.id);
  if (!c) return null;
  return {
    title: c.company_name,
    recipient: {
      company: c.company_name,
      contact: c.contact_person ?? "",
      address: c.address ?? "",
      postalCode: c.postal_code ?? "",
      city: c.city ?? "",
      province: c.province ?? "",
      country: c.country,
      phone: c.phone ?? "",
    },
    ref: null,
    date: null,
    qr: null,
    urgent: false,
    documentation: false,
    boxCount: 1,
  };
}

export async function getLabelSettings(): Promise<{ sender: LabelSender; offsets: LabelOffsets }> {
  const s = await getSettings();
  return {
    sender: {
      name: s.sender_name,
      address: s.sender_address,
      postalCode: s.sender_postal_code,
      city: s.sender_city,
      province: s.sender_province,
      phone: s.sender_phone,
    },
    offsets: parseOffsets(s.label_offsets),
  };
}
