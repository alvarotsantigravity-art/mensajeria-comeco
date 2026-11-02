import {
  SCOPE_EMAIL,
  SCOPES,
  SHIPMENT_TYPE_EMAIL,
  TRANSPORT_EMAIL,
  TRANSPORTS,
  URGENCIES,
  URGENCY_EMAIL,
  URGENCY_SHORT,
  type Urgency,
} from "@/lib/requests/options";
import { isSpain } from "@/lib/requests/provinces";
import type { RequestFormValues } from "@/lib/requests/schema";

// Cuerpo del correo en texto plano: reproduce la plantilla de §3 línea a línea.
// Acepta formularios incompletos (vista previa en vivo).

export type EmailContent = Pick<
  RequestFormValues,
  | "request_date"
  | "requester_name"
  | "requester_phone"
  | "requester_email"
  | "company"
  | "ceco"
  | "concept"
  | "description"
  | "dest_company"
  | "dest_address"
  | "dest_postal_code"
  | "dest_city"
  | "dest_province"
  | "dest_country"
  | "dest_contact"
  | "dest_phone"
  | "urgency"
  | "scope"
  | "transport"
  | "shipment_type"
  | "box_count"
>;

/** "2026-11-01" → "01/11/2026" (sin pasar por Date: evita saltos de zona horaria). */
export function formatRequestDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function destinationLines(v: EmailContent) {
  const address = [v.dest_company, v.dest_address].map((s) => s.trim()).filter(Boolean).join(", ");
  const cityParts = [v.dest_city, v.dest_postal_code].map((s) => s.trim()).filter(Boolean).join(" / ");
  const region = [
    v.dest_province.trim() && v.dest_province.trim() !== v.dest_city.trim() ? v.dest_province.trim() : "",
    isSpain(v.dest_country) ? "" : v.dest_country.trim(),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    address,
    city: region ? `${cityParts} (${region})` : cityParts,
    contact: v.dest_contact.trim(),
    phone: v.dest_phone.trim(),
  };
}

const mark = (checked: boolean) => (checked ? "[X]" : "[ ]");

/** Filas de la tabla de servicio: [urgencia, ámbito, transporte, tipo de envío]. */
export function serviceRows(v: EmailContent): string[][] {
  const isBox = v.shipment_type === "caja";
  const boxes = isBox && v.box_count.trim() ? v.box_count.trim() : "__";
  const typeCells = [
    `${mark(v.shipment_type === "documentacion")} ${SHIPMENT_TYPE_EMAIL.documentacion}`,
    `${mark(isBox)} ${SHIPMENT_TYPE_EMAIL.caja}`,
    `${mark(isBox)} Nº Cajas: ${boxes}`,
  ];
  return [0, 1, 2].map((i) => [
    `${mark(v.urgency === URGENCIES[i])} ${URGENCY_EMAIL[URGENCIES[i]]}`,
    `${mark(v.scope === SCOPES[i])} ${SCOPE_EMAIL[SCOPES[i]]}`,
    `${mark(v.transport === TRANSPORTS[i])} ${TRANSPORT_EMAIL[TRANSPORTS[i]]}`,
    typeCells[i],
  ]);
}

export const SERVICE_HEADERS = ["URGENCIA (Plazo)", "ÁMBITO GEOGRÁFICO", "TIPO TRANSPORTE", "TIPO ENVÍO"];

function textTable(rows: string[][]): string {
  const widths = rows[0].map((_, col) => Math.max(...rows.map((r) => r[col].length)));
  return rows.map((r) => `| ${r.map((cell, col) => cell.padEnd(widths[col])).join(" | ")} |`).join("\n");
}

export function buildEmailBody(v: EmailContent): string {
  const dest = destinationLines(v);
  const contactLeft = `Persona de contacto: ${dest.contact}`;
  // Columna "Teléfono:" como en la plantilla (col. 32), con al menos 4 espacios de separación.
  const contactLine = contactLeft.padEnd(Math.max(32, contactLeft.length + 4)) + `Teléfono: ${dest.phone}`;

  return [
    "SOLICITUD DE SERVICIO DE MENSAJERÍA",
    "",
    `FECHA: ${formatRequestDate(v.request_date)}`,
    `SOLICITANTE: ${v.requester_name.trim()}`,
    `TELÉFONO: ${v.requester_phone.trim()}`,
    `EMAIL: ${v.requester_email.trim()}`,
    `SOCIEDAD/EMPRESA: ${v.company.trim()}`,
    `CECO: ${v.ceco.trim()}`,
    "",
    "DETALLES DE LA PETICIÓN",
    `Concepto: ${v.concept.trim()}`,
    "",
    "DESCRIPCIÓN DEL ENVÍO",
    v.description.trim() || "(Qué se envía, contenido, peso estimado o instrucciones especiales)",
    "",
    "INFORMACIÓN DEL DESTINO",
    `Dirección completa: ${dest.address}`,
    `Ciudad/Código Postal: ${dest.city}`,
    contactLine.trimEnd(),
    "",
    "PRIORIDAD, ALCANCE Y TIPO DE SERVICIO",
    textTable([SERVICE_HEADERS, ...serviceRows(v)]),
  ].join("\n");
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function isoParts(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) } : null;
}

/** "2026-10-30" → "Viernes" (en UTC: el día no depende de la zona horaria). */
export function weekdayName(isoDate: string): string {
  const p = isoParts(isoDate);
  return p ? WEEKDAYS[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()] : "";
}

/** "2026-10-30" → "30-10-26". */
export function formatShortDate(isoDate: string): string {
  const p = isoParts(isoDate);
  return p ? `${String(p.d).padStart(2, "0")}-${String(p.m).padStart(2, "0")}-${String(p.y % 100).padStart(2, "0")}` : "";
}

/** "2026-06-29" → "29-6". */
export function formatDayMonth(isoDate: string): string {
  const p = isoParts(isoDate);
  return p ? `${p.d}-${p.m}` : "";
}

/** "08:00" → "8:00". */
export function formatTime(value: string | undefined): string {
  const match = /^(\d{2}):(\d{2})$/.exec((value ?? "").trim());
  return match ? `${Number(match[1])}:${match[2]}` : "";
}

/** Empresa, dirección, CP, ciudad y (PROVINCIA) en una línea, sin huecos. */
export function placeLine(company?: string, address?: string, postalCode?: string, city?: string, province?: string): string {
  const c = (s?: string) => (s ?? "").trim();
  const region = c(province) && c(province).toLowerCase() !== c(city).toLowerCase() ? `(${c(province).toUpperCase()})` : "";
  return [c(company), c(address), [c(postalCode), c(city)].filter(Boolean).join(" "), region].filter(Boolean).join(" ");
}

export type SubjectContent = EmailContent & Partial<Omit<RequestFormValues, keyof EmailContent>>;

function subjectFields(v: SubjectContent, carrierName = ""): Record<string, string> {
  const s = (value?: string) => (value ?? "").trim();
  const pickupDate = s(v.pickup_date);
  const deliveryDate = s(v.delivery_date);
  return {
    urgencia: v.urgency ? URGENCY_SHORT[v.urgency as Urgency] : "",
    empresa: s(v.dest_company),
    fecha: formatRequestDate(v.request_date),
    proveedor: carrierName,
    op: s(v.op),
    producto: s(v.product),
    origen: s(v.pickup_company).toUpperCase(),
    origen_completo: placeLine(v.pickup_company, v.pickup_address, v.pickup_postal_code, v.pickup_city, v.pickup_province),
    destino: s(v.dest_company).toUpperCase(),
    destino_completo: placeLine(v.dest_company, v.dest_address, v.dest_postal_code, v.dest_city),
    dia_recogida: pickupDate ? `${weekdayName(pickupDate)} ${formatShortDate(pickupDate)}`.toUpperCase() : "",
    hora_recogida: formatTime(v.pickup_time),
    recogida_dm: formatDayMonth(pickupDate),
    dia_entrega: deliveryDate ? `${weekdayName(deliveryDate)} ${formatShortDate(deliveryDate)}`.toUpperCase() : "",
    hora_entrega: formatTime(v.delivery_time),
    entrega_dm: formatDayMonth(deliveryDate),
    palets: s(v.pallets),
  };
}

/** Marcadores que admite la plantilla del asunto (pantalla de proveedores). */
export const SUBJECT_PLACEHOLDERS = Object.keys(subjectFields({} as SubjectContent));

/**
 * Plantilla configurable: {urgencia} · {empresa} · {fecha}, {op}, {origen}…
 * Un tramo entre [corchetes] desaparece si alguno de sus marcadores está vacío.
 */
export function buildSubject(template: string, v: SubjectContent, carrierName = ""): string {
  const fields = subjectFields(v, carrierName);
  const fill = (part: string) => part.replace(/\{(\w+)\}/g, (m, key: string) => (key in fields ? fields[key] : m));
  const withOptional = template.replace(/\[([^\]]*)\]/g, (_, inner: string) => {
    const keys = [...inner.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    return keys.every((k) => !(k in fields) || fields[k]) ? inner : "";
  });
  // Los tramos que quedan vacíos (p.ej. sin urgencia aún) se quitan con su separador.
  return withOptional
    .split("·")
    .map((part) => fill(part).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
}
