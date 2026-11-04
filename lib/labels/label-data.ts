import { z } from "zod";
import { isLabelFormat, type LabelFormat } from "./layouts";

export type LabelSender = { name: string; address: string; postalCode: string; city: string; province: string; phone: string };

export type LabelRecipient = {
  company: string;
  contact: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  country: string;
  phone: string;
};

/** Una etiqueta ya resuelta, lista para pintar (en pantalla o en PDF). */
export type LabelData = {
  sender: LabelSender;
  recipient: LabelRecipient;
  urgent: boolean;
  fragile: boolean;
  documentation: boolean;
  ref: string | null;
  date: string | null; // dd/mm/aaaa
  qr: string | null; // contenido del QR (ID de la solicitud)
  notes: string;
  parcel: { index: number; total: number } | null;
  /** "Bulto" (cajas), "Sobre" (documentación) o "Palé". */
  unit: string;
};

/** Opciones de la pantalla de etiquetas (vienen en la URL). */
export const labelOptionsSchema = z.object({
  formato: z.string().refine(isLabelFormat).catch("4").transform((v) => v as LabelFormat),
  inicio: z.coerce.number().int().min(1).max(8).catch(1),
  bultos: z.coerce.number().int().min(1).max(50).optional().catch(undefined),
  urgente: z.enum(["1", "0"]).optional().catch(undefined),
  fragil: z.enum(["1", "0"]).optional().catch(undefined),
  documentacion: z.enum(["1", "0"]).optional().catch(undefined),
  obs: z.string().max(140).catch("").optional(),
  bordes: z.enum(["1", "0"]).optional().catch(undefined),
});
export type LabelOptions = z.infer<typeof labelOptionsSchema>;

export function parseLabelOptions(params: Record<string, string | string[] | undefined>): LabelOptions {
  const flat = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return labelOptionsSchema.parse(flat);
}

/** Lo que aporta la solicitud (o el destinatario suelto) por defecto. */
export type LabelSource = {
  recipient: LabelRecipient;
  ref: string | null;
  date: string | null;
  qr: string | null;
  urgent: boolean;
  documentation: boolean;
  boxCount: number;
  /** Transporte: el remitente es el origen de la carga, no la oficina. */
  sender?: LabelSender;
  unit?: string;
  /** Observaciones propuestas al abrir la pantalla (OP, producto, código de entrega). */
  defaultNotes?: string;
};

const flag = (v: "1" | "0" | undefined, fallback: boolean) => (v === undefined ? fallback : v === "1");

/** N cajas → N etiquetas "Bulto i/N"; N sobres → "Sobre i/N". Marcar a mano la documentación deja una sola. */
export function buildLabels(source: LabelSource, sender: LabelSender, options: LabelOptions): LabelData[] {
  const documentation = flag(options.documentacion, source.documentation);
  const total = options.bultos ?? (documentation && !source.documentation ? 1 : Math.max(1, source.boxCount));
  const base = {
    sender: source.sender ?? sender,
    unit: source.unit ?? "Bulto",
    recipient: source.recipient,
    urgent: flag(options.urgente, source.urgent),
    fragile: flag(options.fragil, false),
    documentation,
    ref: source.ref,
    date: source.date,
    qr: source.qr,
    notes: (options.obs ?? "").trim(),
  };
  return Array.from({ length: total }, (_, i) => ({ ...base, parcel: total > 1 ? { index: i + 1, total } : null }));
}

/** Líneas de la dirección del destinatario, sin huecos. */
export function recipientLines(r: LabelRecipient) {
  const place = [r.postalCode, r.city].filter(Boolean).join(" ");
  const region = r.province && r.province.toLowerCase() !== r.city.toLowerCase() ? `(${r.province})` : "";
  const country = r.country && !/^espa[ñn]a$/i.test(r.country.trim()) ? r.country.toUpperCase() : "";
  return [r.address, [place, region].filter(Boolean).join(" "), country].filter(Boolean);
}

export const senderLine = (s: LabelSender) =>
  [s.name, s.address, [s.postalCode, s.city].filter(Boolean).join(" ") + (s.province && s.province !== s.city ? ` (${s.province})` : ""), s.phone && `Tel. ${s.phone}`]
    .filter(Boolean)
    .join(" · ");
