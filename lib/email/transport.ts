import type { Carrier } from "@/lib/carriers/types";
import type { RequestFormValues } from "@/lib/requests/schema";
import { formatRequestDate, formatShortDate, formatTime, weekdayName } from "./build-body";

// Correos de transporte. "tabla" reproduce la solicitud de BOYACA (y TIPSA, con su
// código de cliente y tipo de servicio); "lista" la nota corta de RAFA VENTO.

type Row = [label: string, value: string];
type Section = { title: string; rows: Row[] };

const s = (value: string | undefined) => (value ?? "").trim();

/** Saludo según la hora de Madrid: "Buenos días" hasta las 14:00. */
export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("es-ES", { hour: "numeric", hourCycle: "h23", timeZone: "Europe/Madrid" }).format(now));
  return hour < 14 ? "Buenos días" : "Buenas tardes";
}

/** "2026-10-30" + "08:00" → "Viernes 30/10/2026 a las 8:00 horas". */
export function longDate(isoDate: string, time = "", withHours = true): string {
  if (!s(isoDate)) return "";
  const t = formatTime(time);
  return `${weekdayName(isoDate)} ${formatRequestDate(isoDate)}${t ? ` a las ${t}${withHours ? " horas" : ""}` : ""}`;
}

function place(company: string, address: string, postalCode: string, city: string, province: string, country = ""): string {
  const region = s(province) && s(province).toLowerCase() !== s(city).toLowerCase() ? s(province).toUpperCase() : "";
  const foreign = s(country) && !/^espa[ñn]a$/i.test(s(country)) ? s(country).toUpperCase() : "";
  return [s(company), s(address), [s(postalCode), s(city)].filter(Boolean).join(" "), region, foreign].filter(Boolean).join("\n");
}

function opening(v: RequestFormValues, carrier: Carrier, now: Date): string[] {
  const hello = `${greeting(now)}${s(carrier.greetingName) ? ` ${s(carrier.greetingName)}` : ""},`;
  return [hello, s(carrier.emailIntro), s(carrier.customerCode) ? `Nuestro Código de cliente es: ${s(carrier.customerCode)}` : ""].filter(Boolean);
}

const closing = (v: RequestFormValues) => ["Gracias", "Un saludo", s(v.requester_name)].filter(Boolean);

/** Secciones de la tabla de transporte (las comparten el texto y el HTML). */
export function transportSections(v: RequestFormValues, carrier: Carrier): Section[] {
  const codes = carrier.usesCodes;
  const head: Row[] = [
    ["OP", s(v.op)],
    ["PRODUCTO", s(v.product)],
    ["TRANSPORTE", carrier.name.toUpperCase()],
  ];
  if (s(v.concept)) head.push(["Referencia", s(v.concept)]);
  if (carrier.serviceOptions.length || s(v.carrier_service)) {
    head.push([`Tipo de servicio ${carrier.name} solicitado`, s(v.carrier_service)]);
  }

  const pickup: Row[] = [
    ...(codes ? ([["Código", s(v.pickup_code)]] as Row[]) : []),
    ["Origen carga", place(v.pickup_company, v.pickup_address, v.pickup_postal_code, v.pickup_city, v.pickup_province)],
    ...(s(v.pickup_contact) ? ([["Contacto", s(v.pickup_contact)]] as Row[]) : []),
    ["Teléfono", s(v.pickup_phone)],
    ["Hora / Fecha Recogida", longDate(v.pickup_date, v.pickup_time)],
    ["Otros", s(v.pickup_notes)],
  ];

  const delivery: Row[] = [
    ...(codes ? ([["Código", s(v.delivery_code)]] as Row[]) : []),
    ["Dirección de Entrega", place(v.dest_company, v.dest_address, v.dest_postal_code, v.dest_city, v.dest_province, v.dest_country)],
    ["Contacto", s(v.dest_contact)],
    ["Teléfono", s(v.dest_phone)],
    ["Fecha Entrega", longDate(v.delivery_date, "", false)],
    ["Hora de Entrega", formatTime(v.delivery_time)],
    ["Nº de Palé(s)", s(v.pallets)],
    ["Peso total Kg", s(v.weight_kg)],
    ["Otros", s(v.delivery_notes)],
  ];

  return [
    { title: "SOLICITUD DE TRANSPORTE", rows: head },
    { title: "RECOGIDA", rows: pickup },
    { title: "ENTREGA", rows: delivery },
    { title: "OBSERVACIONES", rows: [["", s(v.observations)]] },
  ];
}

function tableText(v: RequestFormValues, carrier: Carrier, now: Date): string {
  const sections = transportSections(v, carrier);
  const width = Math.max(...sections.flatMap((sec) => sec.rows.map(([label]) => label.length))) + 3;
  const body = sections.flatMap((sec) => [
    "",
    sec.title,
    ...sec.rows.flatMap(([label, value]) => {
      if (!label) return value ? [value] : [];
      const [first = "", ...rest] = value.split("\n");
      return [`${`${label}:`.padEnd(width)}${first}`.trimEnd(), ...rest.map((line) => " ".repeat(width) + line)];
    }),
  ]);
  return [...opening(v, carrier, now), ...body, "", ...closing(v)].join("\n");
}

function pallets(value: string): string {
  const p = s(value);
  if (!p) return "";
  return /pal[eé]/i.test(p) ? `Total ${p}` : `Total ${p} ${p === "1" ? "palet" : "palets"}`;
}

/** Puntos de la lista corta (RAFA VENTO). */
export function listItems(v: RequestFormValues): string[] {
  const pickupDay = s(v.pickup_date) ? `${weekdayName(v.pickup_date)} ${formatShortDate(v.pickup_date)}` : "";
  const time = formatTime(v.pickup_time);
  const where = (company: string, city: string) => [s(company), s(city) && !s(company).toLowerCase().includes(s(city).toLowerCase()) ? s(city) : ""].filter(Boolean).join(", ");
  return [
    s(v.product) ? `Solicitud de transporte para ${s(v.product)}` : "",
    pickupDay ? `${pickupDay}${time ? ` a las ${time} h` : ""}` : "",
    s(v.pickup_company) ? `Recogida en ${where(v.pickup_company, v.pickup_city)}` : "",
    s(v.pickup_notes),
    s(v.dest_company) ? `Entrega directa en ${where(v.dest_company, v.dest_city)}` : "",
    s(v.delivery_date) && v.delivery_date !== v.pickup_date ? `Entrega: ${weekdayName(v.delivery_date)} ${formatShortDate(v.delivery_date)}` : "",
    s(v.delivery_notes),
    pallets(v.pallets),
    s(v.weight_kg) ? `Peso total: ${s(v.weight_kg)}` : "",
    s(v.observations),
  ].filter(Boolean);
}

function listHeadline(v: RequestFormValues): string {
  return ["OP", s(v.op), s(v.product)].filter(Boolean).join(" ");
}

function listText(v: RequestFormValues, carrier: Carrier, now: Date): string {
  return [...opening(v, carrier, now), listHeadline(v), "", ...listItems(v).map((item) => `• ${item}`), "", ...closing(v)].join("\n");
}

// ---------------------------------------------------------------------------
// HTML (Gmail ignora <style>: estilos en línea; todo dato se escapa)
// ---------------------------------------------------------------------------

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const multiline = (value: string) => escape(value).replaceAll("\n", "<br>");

const cell = "border:1px solid #222;padding:4px 8px;vertical-align:top;";
const label = `${cell}font-weight:bold;width:210px;`;
const title = `${cell}font-weight:bold;text-align:center;background:#f1f1f1;`;
const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif;font-size:13px;color:#111">${inner}</div>`;
const paragraphs = (lines: string[]) => lines.map((l) => `<p style="margin:0 0 6px">${escape(l)}</p>`).join("");

function tableHtml(v: RequestFormValues, carrier: Carrier, now: Date): string {
  const sections = transportSections(v, carrier);
  const rows = sections
    .map((sec, i) => {
      const heading = `<tr><td colspan="2" style="${title}">${escape(i === 0 ? sec.title : `${sec.title}:`)}</td></tr>`;
      const body = sec.rows
        .map(([l, value]) =>
          l
            ? `<tr><td style="${label}">${escape(`${l}:`)}</td><td style="${cell}">${multiline(value)}</td></tr>`
            : `<tr><td colspan="2" style="${cell}height:48px">${multiline(value)}</td></tr>`,
        )
        .join("");
      return heading + body;
    })
    .join("");
  return wrap(
    paragraphs(opening(v, carrier, now)) +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;margin:10px 0;min-width:520px">${rows}</table>` +
      paragraphs(closing(v)),
  );
}

function listHtml(v: RequestFormValues, carrier: Carrier, now: Date): string {
  const items = listItems(v)
    .map((item) => `<li>${escape(item)}</li>`)
    .join("");
  return wrap(
    paragraphs([...opening(v, carrier, now), listHeadline(v)]) +
      `<ul style="margin:6px 0 12px;padding-left:22px">${items}</ul>` +
      paragraphs(closing(v)),
  );
}

export function buildTransportEmail(v: RequestFormValues, carrier: Carrier, now = new Date()): { text: string; html: string } {
  return carrier.emailLayout === "lista"
    ? { text: listText(v, carrier, now), html: listHtml(v, carrier, now) }
    : { text: tableText(v, carrier, now), html: tableHtml(v, carrier, now) };
}
