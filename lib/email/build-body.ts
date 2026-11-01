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

/** Plantilla configurable: {urgencia} · {empresa} · {fecha}. */
export function buildSubject(template: string, v: EmailContent): string {
  const urgency = v.urgency ? URGENCY_SHORT[v.urgency as Urgency] : "";
  // Los tramos que quedan vacíos (p.ej. sin urgencia aún) se quitan con su separador.
  return template
    .split("·")
    .map((part) =>
      part
        .replaceAll("{urgencia}", urgency)
        .replaceAll("{empresa}", v.dest_company.trim())
        .replaceAll("{fecha}", formatRequestDate(v.request_date))
        .trim(),
    )
    .filter(Boolean)
    .join(" · ");
}
