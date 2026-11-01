import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";
import { SCOPES, SHIPMENT_TYPES, TRANSPORTS, URGENCIES } from "./options";
import { isSpain } from "./provinces";

// Esquemas compartidos cliente/servidor (§3). En el formulario todo son strings;
// los radios sin elegir valen "" y box_count se guarda como texto hasta enviarse.

const text = (max = 200) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
const required = (message: string, max = 200) => text(max).min(1, message);
const phone = z
  .string()
  .trim()
  .refine((v) => isValidPhoneNumber(v, "ES"), "Teléfono no válido.");
const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || isValidPhoneNumber(v, "ES"), "Teléfono no válido.");
const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { error: message });

const EMAIL_LIST = /^\s*$|^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+(\s*[,;]\s*[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+)*\s*$/;

export const requesterShape = {
  request_date: z.iso.date("Fecha no válida."),
  requester_name: required("Indica quién solicita el envío."),
  requester_phone: phone,
  requester_email: z.string().trim().toLowerCase().pipe(z.email("Email no válido.")),
  company: required("Indica la sociedad o empresa."),
  ceco: z.string().trim().regex(/^\d{6,12}$/, "El CECO son solo dígitos (6–12)."),
};

export const petitionShape = {
  concept: required("Indica el concepto."),
  description: required("Describe qué se envía.", 2000),
  shipment_type: choice(SHIPMENT_TYPES, "Elige documentación o caja."),
  box_count: z.string().trim(),
};

export const destinationShape = {
  dest_company: required("Indica la empresa de destino."),
  dest_address: required("Indica la dirección."),
  dest_postal_code: text(12),
  dest_city: required("Indica la ciudad."),
  dest_province: text(80),
  dest_country: required("Indica el país.", 80),
  dest_contact: text(),
  dest_phone: optionalPhone,
};

export const serviceShape = {
  urgency: choice(URGENCIES, "Elige la urgencia."),
  scope: choice(SCOPES, "Elige el ámbito."),
  transport: choice(TRANSPORTS, "Elige el transporte."),
};

export const extrasShape = {
  recipient_id: z.string().nullable(),
  email_cc: z.string().trim().regex(EMAIL_LIST, "Separa los emails con comas."),
  save_recipient: z.boolean(),
};

type Ctx = z.RefinementCtx;

function checkBoxCount(v: { shipment_type?: string; box_count: string }, ctx: Ctx) {
  if (v.shipment_type === "caja" && !/^[1-9]\d{0,2}$/.test(v.box_count)) {
    ctx.addIssue({ code: "custom", path: ["box_count"], message: "Indica el nº de cajas (1 o más)." });
  }
}

function checkPostalCode(v: { dest_country: string; dest_postal_code: string }, ctx: Ctx) {
  if (isSpain(v.dest_country) && !/^\d{5}$/.test(v.dest_postal_code)) {
    ctx.addIssue({ code: "custom", path: ["dest_postal_code"], message: "CP de 5 dígitos." });
  }
}

/** Bloques del formulario (01–04): progreso y escena 3D. */
export const blockSchemas = {
  requester: z.object(requesterShape),
  petition: z.object(petitionShape).superRefine(checkBoxCount),
  destination: z.object(destinationShape).superRefine(checkPostalCode),
  service: z.object(serviceShape),
};

export type BlockKey = keyof typeof blockSchemas;
export const BLOCK_ORDER: BlockKey[] = ["requester", "petition", "destination", "service"];

/** Solicitud completa: obligatoria para abrir Gmail. */
export const requestSchema = z
  .object({ ...requesterShape, ...petitionShape, ...destinationShape, ...serviceShape, ...extrasShape })
  .superRefine((v, ctx) => {
    checkBoxCount(v, ctx);
    checkPostalCode(v, ctx);
  });

export type RequestValues = z.output<typeof requestSchema>;

/** Lo que maneja el formulario: todo texto, radios sin elegir = "". */
export type RequestFormValues = {
  [K in keyof RequestValues]: K extends "save_recipient"
    ? boolean
    : K extends "recipient_id"
      ? string | null
      : string;
};

/** Borrador: sin obligatorios, solo límites de tamaño y valores conocidos. */
export const draftSchema = z.object({
  request_date: z.iso.date().or(z.literal("")),
  requester_name: text(),
  requester_phone: text(40),
  requester_email: text(),
  company: text(),
  ceco: text(20),
  concept: text(),
  description: text(2000),
  shipment_type: z.enum([...SHIPMENT_TYPES, ""]),
  box_count: z.string().trim().regex(/^\d{0,3}$/).catch(""),
  dest_company: text(),
  dest_address: text(),
  dest_postal_code: text(12),
  dest_city: text(),
  dest_province: text(80),
  dest_country: text(80),
  dest_contact: text(),
  dest_phone: text(40),
  urgency: z.enum([...URGENCIES, ""]),
  scope: z.enum([...SCOPES, ""]),
  transport: z.enum([...TRANSPORTS, ""]),
  recipient_id: z.uuid().nullable(),
  email_cc: text(500),
  save_recipient: z.boolean(),
});

export function parseEmailList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}
