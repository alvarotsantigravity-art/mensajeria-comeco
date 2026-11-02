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

/** Solicitud completa de mensajería: obligatoria para abrir Gmail. */
export const requestSchema = z
  .object({ ...requesterShape, ...petitionShape, ...destinationShape, ...serviceShape, ...extrasShape })
  .superRefine((v, ctx) => {
    checkBoxCount(v, ctx);
    checkPostalCode(v, ctx);
  });

// ---------------------------------------------------------------------------
// Formulario de transporte (BOYACA, RAFA VENTO, TIPSA…): recogida + entrega + palés.
// Mismos bloques 01–04 que la mensajería para el progreso y la escena 3D.
// ---------------------------------------------------------------------------

const TIME = /^$|^([01]\d|2[0-3]):[0-5]\d$/;
const time = z.string().trim().regex(TIME, "Hora no válida (hh:mm).");
const date = (message: string) => z.iso.date(message);

export const cargoShape = {
  op: required("Indica la OP.", 40),
  product: required("Indica el producto."),
  concept: text(),
  pickup_code: text(30),
  pickup_company: required("Indica el origen de la carga."),
  pickup_address: text(),
  pickup_postal_code: text(12),
  pickup_city: required("Indica la ciudad de recogida."),
  pickup_province: text(80),
  pickup_contact: text(),
  pickup_phone: optionalPhone,
  pickup_date: date("Indica la fecha de recogida."),
  pickup_time: time,
  pickup_notes: text(300),
};

export const deliveryShape = {
  delivery_code: text(30),
  dest_company: required("Indica dónde se entrega."),
  dest_address: text(),
  dest_postal_code: text(12),
  dest_city: text(),
  dest_province: text(80),
  dest_country: required("Indica el país.", 80),
  dest_contact: text(),
  dest_phone: optionalPhone,
  delivery_date: date("Indica la fecha de entrega."),
  delivery_time: time,
  delivery_notes: text(300),
};

const transportServiceShape = (serviceOptions: string[]) => ({
  pallets: required("Indica el nº de palés.", 40),
  weight_kg: text(40),
  carrier_service: serviceOptions.length
    ? z.string().refine((v) => serviceOptions.includes(v), "Elige el tipo de servicio.")
    : text(),
  observations: text(2000),
});

/** CP de 5 dígitos en España, pero solo si se ha escrito (la entrega puede ir sin dirección completa). */
function checkOptionalPostalCode(prefix: "pickup" | "dest") {
  return (v: Record<string, unknown>, ctx: Ctx) => {
    const cp = String(v[`${prefix}_postal_code`] ?? "");
    const country = prefix === "dest" ? String(v.dest_country ?? "") : "España";
    if (cp && isSpain(country) && !/^\d{5}$/.test(cp)) {
      ctx.addIssue({ code: "custom", path: [`${prefix}_postal_code`], message: "CP de 5 dígitos." });
    }
  };
}

export type RequestSchemas = {
  blocks: Record<BlockKey, z.ZodType>;
  full: z.ZodType;
};

const mensajeriaSchemas: RequestSchemas = { blocks: blockSchemas, full: requestSchema };
const transportCache = new Map<string, RequestSchemas>();

/** Esquemas del formulario según el tipo de proveedor (y sus tipos de servicio). */
export function schemasFor(formKind: string, serviceOptions: string[] = []): RequestSchemas {
  if (formKind !== "transporte") return mensajeriaSchemas;
  const key = serviceOptions.join("\u0000");
  const cached = transportCache.get(key);
  if (cached) return cached;

  const pickupCp = checkOptionalPostalCode("pickup");
  const destCp = checkOptionalPostalCode("dest");
  const service = transportServiceShape(serviceOptions);
  const schemas: RequestSchemas = {
    blocks: {
      requester: z.object(requesterShape),
      petition: z.object(cargoShape).superRefine(pickupCp),
      destination: z.object(deliveryShape).superRefine(destCp),
      service: z.object(service),
    },
    full: z
      .object({ ...requesterShape, ...cargoShape, ...deliveryShape, ...service, ...extrasShape })
      .superRefine((v, ctx) => {
        pickupCp(v, ctx);
        destCp(v, ctx);
      }),
  };
  transportCache.set(key, schemas);
  return schemas;
}

/** Borrador: sin obligatorios, solo límites de tamaño y valores conocidos. */
export const draftSchema = z.object({
  carrier: z.string().trim().regex(/^[a-z0-9-]{2,30}$/).catch("mensajeria"),
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
  // Transporte
  op: text(40),
  product: text(),
  pickup_recipient_id: z.uuid().nullable(),
  pickup_code: text(30),
  pickup_company: text(),
  pickup_address: text(),
  pickup_postal_code: text(12),
  pickup_city: text(),
  pickup_province: text(80),
  pickup_contact: text(),
  pickup_phone: text(40),
  pickup_date: z.iso.date().or(z.literal("")).catch(""),
  pickup_time: z.string().trim().regex(TIME).catch(""),
  pickup_notes: text(300),
  delivery_code: text(30),
  delivery_date: z.iso.date().or(z.literal("")).catch(""),
  delivery_time: z.string().trim().regex(TIME).catch(""),
  delivery_notes: text(300),
  pallets: text(40),
  weight_kg: text(40),
  carrier_service: text(80),
  observations: text(2000),
});

/** Lo que maneja el formulario: todo texto, radios sin elegir = "". */
export type RequestFormValues = {
  [K in keyof z.output<typeof draftSchema>]: K extends "save_recipient"
    ? boolean
    : K extends "recipient_id" | "pickup_recipient_id"
      ? string | null
      : string;
};

export type RequestValues = z.output<typeof requestSchema>;

/** Campos de transporte vacíos (mensajería y solicitudes anteriores a los proveedores). */
export const EMPTY_TRANSPORT_VALUES = {
  op: "",
  product: "",
  pickup_recipient_id: null,
  pickup_code: "",
  pickup_company: "",
  pickup_address: "",
  pickup_postal_code: "",
  pickup_city: "",
  pickup_province: "",
  pickup_contact: "",
  pickup_phone: "",
  pickup_date: "",
  pickup_time: "",
  pickup_notes: "",
  delivery_code: "",
  delivery_date: "",
  delivery_time: "",
  delivery_notes: "",
  pallets: "",
  weight_kg: "",
  carrier_service: "",
  observations: "",
} satisfies Partial<RequestFormValues>;

export function parseEmailList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}
