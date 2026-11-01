import { formatRequestDate, destinationLines, SERVICE_HEADERS, serviceRows, type EmailContent } from "./build-body";

// Versión HTML para "Copiar como tabla": mismo contenido que el texto plano,
// con estilos en línea (Gmail ignora <style>). Todo dato se escapa.

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const cell = "border:1px solid #c9c9c9;padding:6px 10px;vertical-align:top;";
const head = `${cell}background:#f1f1f1;font-weight:bold;text-align:left;`;
const h = "margin:16px 0 6px;font-size:13px;font-weight:bold;";

function row(label: string, value: string) {
  return `<tr><td style="${head}width:190px">${escape(label)}</td><td style="${cell}">${escape(value)}</td></tr>`;
}

export function buildEmailHtml(v: EmailContent): string {
  const dest = destinationLines(v);
  const table = (rows: string) =>
    `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">${rows}</table>`;

  const service = [SERVICE_HEADERS, ...serviceRows(v)]
    .map(
      (r, i) =>
        `<tr>${r.map((c) => (i === 0 ? `<th style="${head}">${escape(c)}</th>` : `<td style="${cell}">${escape(c)}</td>`)).join("")}</tr>`,
    )
    .join("");

  return [
    `<div style="font-family:Arial,sans-serif;font-size:13px;color:#111">`,
    `<p style="${h}font-size:15px">SOLICITUD DE SERVICIO DE MENSAJERÍA</p>`,
    table(
      [
        row("FECHA", formatRequestDate(v.request_date)),
        row("SOLICITANTE", v.requester_name.trim()),
        row("TELÉFONO", v.requester_phone.trim()),
        row("EMAIL", v.requester_email.trim()),
        row("SOCIEDAD/EMPRESA", v.company.trim()),
        row("CECO", v.ceco.trim()),
      ].join(""),
    ),
    `<p style="${h}">DETALLES DE LA PETICIÓN</p>`,
    table(row("Concepto", v.concept.trim())),
    `<p style="${h}">DESCRIPCIÓN DEL ENVÍO</p>`,
    `<p style="margin:0;white-space:pre-wrap">${escape(v.description.trim())}</p>`,
    `<p style="${h}">INFORMACIÓN DEL DESTINO</p>`,
    table(
      [
        row("Dirección completa", dest.address),
        row("Ciudad/Código Postal", dest.city),
        row("Persona de contacto", dest.contact),
        row("Teléfono", dest.phone),
      ].join(""),
    ),
    `<p style="${h}">PRIORIDAD, ALCANCE Y TIPO DE SERVICIO</p>`,
    table(service),
    `</div>`,
  ].join("");
}
