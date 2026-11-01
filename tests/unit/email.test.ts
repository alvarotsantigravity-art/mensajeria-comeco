import { describe, expect, test } from "vitest";
import { buildEmailBody, buildSubject, formatRequestDate } from "@/lib/email/build-body";
import { buildEmailHtml } from "@/lib/email/build-html";
import { buildGmailUrl } from "@/lib/email/gmail-url";
import { requestSchema, type RequestFormValues } from "@/lib/requests/schema";
import { getSuggestions } from "@/lib/requests/suggestions";

const values: RequestFormValues = {
  request_date: "2026-11-03",
  requester_name: "Ana Pérez",
  requester_phone: "916 76 75 04",
  requester_email: "ana@comecografico.com",
  company: "Comeco Gráfico",
  ceco: "2690600250",
  concept: "Pruebas de color",
  description: "2 pliegos en tubo, 1 kg aprox.",
  shipment_type: "caja",
  box_count: "3",
  dest_company: "Notaría Ejemplo",
  dest_address: "Calle de Alcalá, 100",
  dest_postal_code: "28009",
  dest_city: "Madrid",
  dest_province: "Madrid",
  dest_country: "España",
  dest_contact: "Lucía Gómez",
  dest_phone: "910 000 001",
  urgency: "urgente",
  scope: "local",
  transport: "moto",
  recipient_id: null,
  email_cc: "recepcionjv40bis@vocento.com",
  save_recipient: true,
};

describe("cuerpo del correo (plantilla §3)", () => {
  test("reproduce la plantilla línea a línea", () => {
    expect(buildEmailBody(values)).toBe(
      [
        "SOLICITUD DE SERVICIO DE MENSAJERÍA",
        "",
        "FECHA: 03/11/2026",
        "SOLICITANTE: Ana Pérez",
        "TELÉFONO: 916 76 75 04",
        "EMAIL: ana@comecografico.com",
        "SOCIEDAD/EMPRESA: Comeco Gráfico",
        "CECO: 2690600250",
        "",
        "DETALLES DE LA PETICIÓN",
        "Concepto: Pruebas de color",
        "",
        "DESCRIPCIÓN DEL ENVÍO",
        "2 pliegos en tubo, 1 kg aprox.",
        "",
        "INFORMACIÓN DEL DESTINO",
        "Dirección completa: Notaría Ejemplo, Calle de Alcalá, 100",
        "Ciudad/Código Postal: Madrid / 28009",
        "Persona de contacto: Lucía Gómez    Teléfono: 910 000 001",
        "",
        "PRIORIDAD, ALCANCE Y TIPO DE SERVICIO",
        "| URGENCIA (Plazo)               | ÁMBITO GEOGRÁFICO | TIPO TRANSPORTE | TIPO ENVÍO        |",
        "| [X] Urgente (menos de 4 horas) | [X] Local/Urbano  | [X] Moto        | [ ] Documentación |",
        "| [ ] Estándar (en el día)       | [ ] Nacional      | [ ] Furgoneta   | [X] Caja          |",
        "| [ ] Económico (día siguiente)  | [ ] Internacional | [ ] Camión      | [X] Nº Cajas: 3   |",
      ].join("\n"),
    );
  });

  test("documentación: sin cajas marcadas y Nº Cajas vacío", () => {
    const body = buildEmailBody({ ...values, shipment_type: "documentacion", box_count: "" });
    expect(body).toContain("[X] Documentación");
    expect(body).toContain("[ ] Caja");
    expect(body).toContain("[ ] Nº Cajas: __");
  });

  test("destino internacional muestra el país", () => {
    const body = buildEmailBody({ ...values, dest_city: "Lisboa", dest_postal_code: "1100-053", dest_province: "", dest_country: "Portugal" });
    expect(body).toContain("Ciudad/Código Postal: Lisboa / 1100-053 (Portugal)");
  });
});

describe("asunto, HTML y Gmail", () => {
  const template = "Solicitud mensajería · {urgencia} · {empresa} · {fecha}";

  test("asunto con la plantilla configurable", () => {
    expect(buildSubject(template, values)).toBe("Solicitud mensajería · Urgente · Notaría Ejemplo · 03/11/2026");
  });

  test("el asunto omite tramos vacíos", () => {
    expect(buildSubject(template, { ...values, urgency: "" })).toBe("Solicitud mensajería · Notaría Ejemplo · 03/11/2026");
  });

  test("el HTML escapa los datos", () => {
    const html = buildEmailHtml({ ...values, concept: "<script>alert(1)</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  test("URL de Gmail con todo codificado", () => {
    const url = new URL(
      buildGmailUrl({ to: ["info@lrmensajeros.com"], cc: ["a@b.com", "c@d.com"], subject: "Á & B", body: "L1\nL2", authuser: "x@comecografico.com" }),
    );
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe("info@lrmensajeros.com");
    expect(url.searchParams.get("cc")).toBe("a@b.com,c@d.com");
    expect(url.searchParams.get("su")).toBe("Á & B");
    expect(url.searchParams.get("body")).toBe("L1\nL2");
    expect(url.searchParams.get("authuser")).toBe("x@comecografico.com");
  });

  test("fecha sin saltos de zona horaria", () => {
    expect(formatRequestDate("2026-01-01")).toBe("01/01/2026");
  });
});

describe("validación y sugerencias", () => {
  test("una solicitud completa es válida", () => {
    expect(requestSchema.safeParse(values).success).toBe(true);
  });

  test("caja sin nº de cajas o CP español incorrecto falla", () => {
    const result = requestSchema.safeParse({ ...values, box_count: "", dest_postal_code: "2800" });
    expect(result.success).toBe(false);
    const paths = result.error!.issues.map((i) => i.path.join("."));
    expect(paths).toEqual(expect.arrayContaining(["box_count", "dest_postal_code"]));
  });

  test("CP extranjero libre", () => {
    expect(requestSchema.safeParse({ ...values, dest_country: "Portugal", dest_postal_code: "1100-053", scope: "internacional" }).success).toBe(true);
  });

  test("sugiere Local en Madrid, Internacional fuera y Furgoneta con 5 cajas", () => {
    const base = { ...values, scope: "", transport: "" };
    expect(getSuggestions({ ...base, dest_province: "" }, "Madrid")).toEqual([
      expect.objectContaining({ field: "scope", value: "local" }),
    ]);
    expect(getSuggestions({ ...base, dest_country: "Francia" }, "Madrid")[0]).toMatchObject({ value: "internacional" });
    expect(getSuggestions({ ...base, box_count: "5" }, "Madrid")).toContainEqual(
      expect.objectContaining({ field: "transport", value: "furgoneta" }),
    );
  });
});
