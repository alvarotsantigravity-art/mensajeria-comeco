import type { Carrier } from "@/lib/carriers/types";
import { parseEmailList, type RequestFormValues } from "@/lib/requests/schema";
import { buildEmailBody, buildSubject } from "./build-body";
import { buildEmailHtml } from "./build-html";
import { buildTransportEmail } from "./transport";

export type ComposedEmail = { to: string[]; cc: string[]; subject: string; text: string; html: string };

/** Correo completo de una solicitud según su proveedor (Para, CC, asunto y cuerpo). */
export function composeEmail(v: RequestFormValues, carrier: Carrier, now = new Date()): ComposedEmail {
  const subject = buildSubject(carrier.subjectTemplate, v, carrier.name);
  const cc = parseEmailList(v.email_cc);
  if (carrier.formKind === "mensajeria" || carrier.emailLayout === "mensajeria") {
    return { to: carrier.emailTo, cc, subject, text: buildEmailBody(v), html: buildEmailHtml(v) };
  }
  return { to: carrier.emailTo, cc, subject, ...buildTransportEmail(v, carrier, now) };
}
