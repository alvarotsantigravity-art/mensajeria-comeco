import { formatRequestDate } from "@/lib/email/build-body";
import { formatDate } from "@/lib/format";
import {
  SCOPE_EMAIL,
  SHIPMENT_TYPE_EMAIL,
  STATUS_LABEL,
  TRANSPORT_EMAIL,
  URGENCY_SHORT,
  type Scope,
  type ShipmentType,
  type Status,
  type Transport,
  type Urgency,
} from "./options";
import type { ShipmentRequestRow } from "./data";

// CSV para Excel en español: separador ";", BOM UTF-8 y CRLF.

const label = <K extends string>(map: Record<K, string>, value: string | null) => (value ? (map[value as K] ?? value) : "");

/** Comillas cuando hace falta y neutraliza fórmulas (=, +, -, @) al abrirlo en Excel. */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const COLUMNS: [string, (r: ShipmentRequestRow) => string | number | null][] = [
  ["Referencia", (r) => r.ref],
  ["Fecha", (r) => formatRequestDate(r.request_date)],
  ["Estado", (r) => label(STATUS_LABEL, r.status as Status)],
  ["Solicitante", (r) => r.requester_name],
  ["Sociedad", (r) => r.company],
  ["CECO", (r) => r.ceco],
  ["Concepto", (r) => r.concept],
  ["Descripción", (r) => r.description],
  ["Empresa destino", (r) => r.dest_company],
  ["Dirección", (r) => r.dest_address],
  ["CP", (r) => r.dest_postal_code],
  ["Ciudad", (r) => r.dest_city],
  ["Provincia", (r) => r.dest_province],
  ["País", (r) => r.dest_country],
  ["Contacto", (r) => r.dest_contact],
  ["Teléfono contacto", (r) => r.dest_phone],
  ["Urgencia", (r) => label(URGENCY_SHORT, r.urgency as Urgency)],
  ["Ámbito", (r) => label(SCOPE_EMAIL, r.scope as Scope)],
  ["Transporte", (r) => label(TRANSPORT_EMAIL, r.transport as Transport)],
  ["Tipo", (r) => label(SHIPMENT_TYPE_EMAIL, r.shipment_type as ShipmentType)],
  ["Cajas", (r) => r.box_count],
  ["Enviada el", (r) => (r.sent_at ? formatDate(r.sent_at) : "")],
  // Transporte (al final: las columnas de siempre no cambian de sitio)
  ["Proveedor", (r) => r.carrier],
  ["OP", (r) => r.op],
  ["Producto", (r) => r.product],
  ["Origen", (r) => r.pickup_company],
  ["Código recogida", (r) => r.pickup_code],
  ["Fecha recogida", (r) => (r.pickup_date ? formatRequestDate(r.pickup_date) : "")],
  ["Hora recogida", (r) => r.pickup_time],
  ["Código entrega", (r) => r.delivery_code],
  ["Fecha entrega", (r) => (r.delivery_date ? formatRequestDate(r.delivery_date) : "")],
  ["Hora entrega", (r) => r.delivery_time],
  ["Palés", (r) => r.pallets],
  ["Peso (kg)", (r) => r.weight_kg],
  ["Servicio", (r) => r.carrier_service],
  ["Observaciones", (r) => r.observations],
];

/** carrierNames: slug → nombre del proveedor (sin él, sale el slug). */
export function buildHistoryCsv(rows: ShipmentRequestRow[], carrierNames: Record<string, string> = {}): string {
  const lines = [COLUMNS.map(([title]) => csvCell(title)).join(";")];
  for (const row of rows) {
    const named = { ...row, carrier: carrierNames[row.carrier] ?? row.carrier };
    lines.push(COLUMNS.map(([, get]) => csvCell(get(named))).join(";"));
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
