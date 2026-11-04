import { describe, expect, test } from "vitest";
import type { Carrier } from "@/lib/carriers/types";
import { buildSubject } from "@/lib/email/build-body";
import { composeEmail } from "@/lib/email/compose";
import { greeting, listItems } from "@/lib/email/transport";
import { buildLabels, parseLabelOptions } from "@/lib/labels/label-data";
import { EMPTY_TRANSPORT_VALUES, schemasFor, type RequestFormValues } from "@/lib/requests/schema";

const carrier = (over: Partial<Carrier>): Carrier => ({
  slug: "boyaca",
  name: "BOYACA",
  formKind: "transporte",
  emailLayout: "tabla",
  refPrefix: "BOY",
  emailTo: ["editorial@boyaca.es", "cperez@boyaca.es"],
  emailCc: [],
  subjectTemplate:
    "SOLICITUD DE TRANSPORTE {op} {producto} {origen} {dia_recogida}[ a las {hora_recogida} h] a CARGA EN {origen} - Y ENTREGA DIRECTA {destino}",
  emailIntro: "Necesitamos transporte para",
  greetingName: "",
  customerCode: "",
  serviceOptions: [],
  usesCodes: true,
  active: true,
  sortOrder: 0,
  ...over,
});

const boyaca = carrier({});
const rafa = carrier({ slug: "rafa-vento", name: "RAFA VENTO", emailLayout: "lista", emailIntro: "Solicitud de transporte", greetingName: "Rafa", usesCodes: false });
const tipsa = carrier({
  slug: "tipsa",
  name: "TIPSA",
  emailIntro: "Necesitamos el siguiente servicio con TIPSA",
  customerCode: "09211",
  serviceOptions: ["TIPSA 10 H (Urgente)", "TIPSA 14 H"],
  usesCodes: false,
  subjectTemplate: "SOLICITUD DE SERVICIO RECOGIDA {recogida_dm} EN {origen_completo} // ENTREGA {entrega_dm} EN {destino_completo}",
});

// Datos de la solicitud de BOYACA del PDF (OP2601850, 30/10/2026).
const values: RequestFormValues = {
  ...EMPTY_TRANSPORT_VALUES,
  carrier: "boyaca",
  request_date: "2026-10-29",
  requester_name: "José Ángel",
  requester_phone: "916 76 75 04",
  requester_email: "jose@comecografico.com",
  company: "Comeco Gráfico",
  ceco: "2690600250",
  concept: "",
  description: "",
  shipment_type: "palets",
  envelope_count: "",
  box_count: "",
  urgency: "",
  scope: "",
  transport: "",
  recipient_id: null,
  email_cc: "",
  save_recipient: false,
  op: "OP2601850",
  product: "INTERIORES XL SEMANAL 2037",
  pickup_code: "178",
  pickup_company: "Rotomadrid S.L.",
  pickup_address: "Calle meridiano 19",
  pickup_postal_code: "28850",
  pickup_city: "Torrejón de Ardoz",
  pickup_province: "Madrid",
  pickup_phone: "916 76 75 04",
  pickup_date: "2026-10-30",
  pickup_time: "08:00",
  delivery_code: "123",
  dest_company: "Litografis (Pavimar) Móstoles",
  dest_address: "",
  dest_postal_code: "",
  dest_city: "Móstoles",
  dest_province: "",
  dest_country: "España",
  dest_contact: "",
  dest_phone: "917 97 90 73",
  delivery_date: "2026-10-30",
  pallets: "15 palets aprox",
  weight_kg: "24000kg",
};

const afternoon = new Date("2026-10-29T15:33:00Z"); // 16:33 en Madrid

describe("asunto de transporte", () => {
  test("BOYACA reproduce el asunto del PDF", () => {
    expect(buildSubject(boyaca.subjectTemplate, values, boyaca.name)).toBe(
      "SOLICITUD DE TRANSPORTE OP2601850 INTERIORES XL SEMANAL 2037 ROTOMADRID S.L. VIERNES 30-10-26 a las 8:00 h a CARGA EN ROTOMADRID S.L. - Y ENTREGA DIRECTA LITOGRAFIS (PAVIMAR) MÓSTOLES",
    );
  });

  test("sin hora, el tramo [a las …] desaparece", () => {
    expect(buildSubject(boyaca.subjectTemplate, { ...values, pickup_time: "" })).toContain("VIERNES 30-10-26 a CARGA EN");
  });

  test("TIPSA: recogida y entrega con día-mes y dirección completa", () => {
    const v = {
      ...values,
      pickup_company: "COMECO DISTRIBUCIÓN",
      pickup_address: "C / Meridiano Nº 19",
      pickup_date: "2026-06-29",
      dest_company: "ALTAVIA IBÉRICA",
      dest_address: "Carrer Llull, 133 - 6S",
      dest_postal_code: "08005",
      dest_city: "Barcelona",
      delivery_date: "2026-06-30",
    };
    expect(buildSubject(tipsa.subjectTemplate, v)).toBe(
      "SOLICITUD DE SERVICIO RECOGIDA 29-6 EN COMECO DISTRIBUCIÓN C / Meridiano Nº 19 28850 Torrejón de Ardoz (MADRID) // ENTREGA 30-6 EN ALTAVIA IBÉRICA Carrer Llull, 133 - 6S 08005 Barcelona",
    );
  });

  test("la plantilla de mensajería no cambia", () => {
    expect(buildSubject("Solicitud mensajería · {urgencia} · {empresa} · {fecha}", { ...values, urgency: "" })).toBe(
      "Solicitud mensajería · Litografis (Pavimar) Móstoles · 29/10/2026",
    );
  });
});

describe("cuerpo de transporte", () => {
  test("BOYACA: tabla con códigos, recogida, entrega y palés", () => {
    const email = composeEmail(values, boyaca, afternoon);
    expect(email.to).toEqual(["editorial@boyaca.es", "cperez@boyaca.es"]);
    expect(email.text).toMatch(/^Buenas tardes,\nNecesitamos transporte para\n/);
    expect(email.text).toContain("TRANSPORTE:");
    expect(email.text).toMatch(/Código:\s+178/);
    expect(email.text).toMatch(/Origen carga:\s+Rotomadrid S\.L\.\n\s+Calle meridiano 19\n\s+28850 Torrejón de Ardoz\n\s+MADRID/);
    expect(email.text).toMatch(/Hora \/ Fecha Recogida:\s+Viernes 30\/10\/2026 a las 8:00 horas/);
    expect(email.text).toMatch(/Código:\s+123/);
    expect(email.text).toMatch(/Nº de Palé\(s\):\s+15 palets aprox/);
    expect(email.text).toMatch(/Peso total Kg:\s+24000kg/);
    expect(email.text).toMatch(/Gracias\nUn saludo\nJosé Ángel$/);
    expect(email.html).toContain("<table");
    expect(email.html).not.toContain("<script");
  });

  test("TIPSA: código de cliente y tipo de servicio, sin códigos de BOYACA", () => {
    const email = composeEmail({ ...values, carrier_service: "TIPSA 14 H", concept: "DIGITAL · MUESTRAS CAPRABO" }, tipsa, afternoon);
    expect(email.text).toContain("Necesitamos el siguiente servicio con TIPSA\nNuestro Código de cliente es: 09211");
    expect(email.text).toMatch(/Tipo de servicio TIPSA solicitado:\s+TIPSA 14 H/);
    expect(email.text).toMatch(/Referencia:\s+DIGITAL · MUESTRAS CAPRABO/);
    expect(email.text).not.toMatch(/Código:/);
  });

  test("RAFA VENTO: lista corta con saludo personal", () => {
    const email = composeEmail({ ...values, pallets: "2" }, rafa, new Date("2026-10-09T09:29:00Z"));
    expect(email.text.split("\n").slice(0, 3)).toEqual(["Buenos días Rafa,", "Solicitud de transporte", "OP OP2601850 INTERIORES XL SEMANAL 2037"]);
    expect(listItems({ ...values, pallets: "2" })).toEqual([
      "Solicitud de transporte para INTERIORES XL SEMANAL 2037",
      "Viernes 30-10-26 a las 8:00 h",
      "Recogida en Rotomadrid S.L., Torrejón de Ardoz",
      "Entrega directa en Litografis (Pavimar) Móstoles",
      "Total 2 palets",
      "Peso total: 24000kg",
    ]);
    expect(email.html).toContain("<ul");
  });

  test("el contador sigue al tipo de envío", () => {
    const docs = { ...values, shipment_type: "documentacion", envelope_count: "2", pallets: "" };
    expect(composeEmail(docs, boyaca).text).toMatch(/Nº de Sobre\(s\):\s+2/);
    expect(listItems(docs)).toContain("Total 2 sobres");
    const boxes = { ...values, shipment_type: "caja", box_count: "1", pallets: "" };
    expect(composeEmail(boxes, boyaca).text).toMatch(/Nº de Caja\(s\):\s+1/);
    expect(listItems(boxes)).toContain("Total 1 caja");
  });

  test("el HTML escapa los datos", () => {
    expect(composeEmail({ ...values, product: "<b>x</b>" }, boyaca).html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });

  test("saludo según la hora de Madrid", () => {
    expect(greeting(new Date("2026-10-29T08:00:00Z"))).toBe("Buenos días");
    expect(greeting(new Date("2026-10-29T13:30:00Z"))).toBe("Buenas tardes");
  });
});

describe("validación de transporte", () => {
  test("los datos del PDF de BOYACA son válidos", () => {
    expect(schemasFor("transporte").full.safeParse(values).success).toBe(true);
  });

  test("TIPSA exige elegir el tipo de servicio", () => {
    const schema = schemasFor("transporte", tipsa.serviceOptions).full;
    expect(schema.safeParse(values).success).toBe(false);
    expect(schema.safeParse({ ...values, carrier_service: "TIPSA 10 H (Urgente)" }).success).toBe(true);
  });

  test("faltan OP, origen, fecha de recogida y palés", () => {
    const result = schemasFor("transporte").full.safeParse({ ...values, op: "", pickup_company: "", pickup_date: "", pallets: "" });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["op", "pickup_company", "pickup_date", "pallets"]));
  });

  test("el tipo de envío es obligatorio y admite sobres y cajas", () => {
    const schema = schemasFor("transporte").full;
    expect(schema.safeParse({ ...values, shipment_type: "" }).success).toBe(false);
    expect(schema.safeParse({ ...values, shipment_type: "documentacion", pallets: "" }).success).toBe(false);
    expect(schema.safeParse({ ...values, shipment_type: "documentacion", pallets: "", envelope_count: "3" }).success).toBe(true);
    expect(schema.safeParse({ ...values, shipment_type: "caja", pallets: "", box_count: "3" }).success).toBe(true);
  });

  test("CP de entrega opcional, pero de 5 dígitos si se escribe", () => {
    expect(schemasFor("transporte").full.safeParse({ ...values, dest_postal_code: "2893" }).success).toBe(false);
  });

  test("la mensajería sigue con su esquema", () => {
    expect(schemasFor("mensajeria").blocks.service).toBeDefined();
    expect(schemasFor("mensajeria").full.safeParse(values).success).toBe(false);
  });
});

describe("etiquetas de palé", () => {
  const sender = { name: "Comeco Gráfico", address: "C. Meridiano, 19", postalCode: "28850", city: "Torrejón de Ardoz", province: "Madrid", phone: "" };
  const recipient = { company: "Litografis", contact: "", address: "", postalCode: "", city: "Móstoles", province: "", country: "España", phone: "" };

  test("una por palé, con el origen de la carga como remitente", () => {
    const origin = { ...sender, name: "Rotomadrid S.L." };
    const labels = buildLabels(
      { recipient, ref: "BOY-2026-0001", date: "30/10/2026", qr: null, urgent: false, documentation: false, boxCount: 3, unit: "Palé", sender: origin },
      sender,
      parseLabelOptions({}),
    );
    expect(labels).toHaveLength(3);
    expect(labels[2]).toMatchObject({ unit: "Palé", parcel: { index: 3, total: 3 }, sender: { name: "Rotomadrid S.L." } });
  });

  test("la mensajería sigue con bultos y el remitente de la oficina", () => {
    const [label] = buildLabels({ recipient, ref: null, date: null, qr: null, urgent: false, documentation: true, boxCount: 1 }, sender, parseLabelOptions({}));
    expect(label).toMatchObject({ unit: "Bulto", sender: { name: "Comeco Gráfico" } });
  });
});
