import { describe, expect, test } from "vitest";
import { buildHistoryCsv, csvCell } from "@/lib/requests/csv";
import type { ShipmentRequestRow } from "@/lib/requests/data";

describe("csvCell", () => {
  test("deja el texto simple tal cual", () => {
    expect(csvCell("Madrid")).toBe("Madrid");
    expect(csvCell(null)).toBe("");
    expect(csvCell(3)).toBe("3");
  });

  test("entrecomilla separadores, comillas y saltos de línea", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('dice "hola"')).toBe('"dice ""hola"""');
    expect(csvCell("línea 1\nlínea 2")).toBe('"línea 1\nlínea 2"');
  });

  test("neutraliza fórmulas de Excel", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+34600111222")).toBe("'+34600111222");
    expect(csvCell("@x")).toBe("'@x");
  });
});

describe("buildHistoryCsv", () => {
  const row = {
    ref: "MSJ-2026-0001",
    request_date: "2026-11-01",
    status: "enviada",
    requester_name: "Ana",
    company: "Comeco Gráfico",
    ceco: "2690600250",
    concept: "Pruebas",
    description: "Dos cajas; frágil",
    dest_company: "Notaría Ejemplo",
    dest_address: "Calle Mayor 1",
    dest_postal_code: "28009",
    dest_city: "Madrid",
    dest_province: "Madrid",
    dest_country: "España",
    dest_contact: null,
    dest_phone: null,
    urgency: "urgente",
    scope: "local",
    transport: "moto",
    shipment_type: "caja",
    box_count: 2,
    sent_at: "2026-11-01T10:00:00Z",
  } as unknown as ShipmentRequestRow;

  test("BOM, cabecera y filas con ; y CRLF", () => {
    const csv = buildHistoryCsv([row]);
    expect(csv.startsWith("﻿Referencia;Fecha;Estado;")).toBe(true);
    const [, line] = csv.slice(1).split("\r\n");
    expect(line).toContain("MSJ-2026-0001;01/11/2026;Enviada;Ana");
    expect(line).toContain('"Dos cajas; frágil"');
    expect(line).toContain("Urgente;Local/Urbano;Moto;Caja;2;01/11/2026");
  });
});
