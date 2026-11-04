import { describe, expect, it } from "vitest";
import { buildLabels, parseLabelOptions, recipientLines, senderLine, type LabelSource } from "@/lib/labels/label-data";
import { cellSize, parseOffsets, planSheets } from "@/lib/labels/layouts";

const sender = { name: "Comeco Gráfico", address: "C. Meridiano, 19", postalCode: "28850", city: "Torrejón de Ardoz", province: "Madrid", phone: "916 76 75 04" };
const source: LabelSource = {
  recipient: { company: "Notaría X", contact: "Ana", address: "Calle Mayor 1", postalCode: "28013", city: "Madrid", province: "Madrid", country: "España", phone: "912345678" },
  ref: "MSJ-2026-0007",
  date: "01/11/2026",
  qr: "id-1",
  urgent: true,
  documentation: false,
  boxCount: 3,
};

describe("layouts", () => {
  it("8 por hoja son 105 × 74,25 mm (hoja Apli de 8)", () => {
    expect(cellSize("8")).toEqual({ width: 105, height: 74.25 });
    expect(cellSize("4")).toEqual({ width: 105, height: 148.5 });
  });

  it("empieza en la posición N y pasa a otra hoja cuando no caben", () => {
    const pages = planSheets([1, 2, 3], "4", 3);
    expect(pages).toEqual([
      [null, null, 1, 2],
      [3, null, null, null],
    ]);
  });

  it("limita la posición inicial al formato y siempre devuelve una hoja", () => {
    expect(planSheets([1], "2", 7)).toEqual([[null, 1]]);
    expect(planSheets([], "1", 1)).toEqual([[null]]);
  });

  it("acota la calibración a ±10 mm", () => {
    expect(parseOffsets({ top: 3.14, left: -40 })).toEqual({ top: 3.1, left: -10 });
    expect(parseOffsets(null)).toEqual({ top: 0, left: 0 });
  });
});

describe("buildLabels", () => {
  it("N cajas → N etiquetas numeradas Bulto i/N", () => {
    const labels = buildLabels(source, sender, parseLabelOptions({}));
    expect(labels.map((l) => l.parcel)).toEqual([
      { index: 1, total: 3 },
      { index: 2, total: 3 },
      { index: 3, total: 3 },
    ]);
    expect(labels[0]).toMatchObject({ urgent: true, fragile: false, documentation: false });
  });

  it("documentación va en una etiqueta sin numerar; las opciones mandan", () => {
    const labels = buildLabels(source, sender, parseLabelOptions({ documentacion: "1", urgente: "0", fragil: "1", obs: " Recepción " }));
    expect(labels).toHaveLength(1);
    expect(labels[0]).toMatchObject({ parcel: null, urgent: false, fragile: true, notes: "Recepción" });
  });

  it("N sobres → N etiquetas numeradas Sobre i/N", () => {
    const labels = buildLabels({ ...source, documentation: true, unit: "Sobre" }, sender, parseLabelOptions({}));
    expect(labels).toHaveLength(3);
    expect(labels[1]).toMatchObject({ unit: "Sobre", documentation: true, parcel: { index: 2, total: 3 } });
  });

  it("ignora opciones inválidas", () => {
    expect(parseLabelOptions({ formato: "9", inicio: "-2", bultos: "abc" })).toMatchObject({ formato: "4", inicio: 1, bultos: undefined });
  });
});

describe("texto de la etiqueta", () => {
  it("omite España y la provincia repetida; muestra el país si es extranjero", () => {
    expect(recipientLines(source.recipient)).toEqual(["Calle Mayor 1", "28013 Madrid"]);
    expect(recipientLines({ ...source.recipient, city: "Paris", province: "", country: "Francia", postalCode: "75001" })).toEqual([
      "Calle Mayor 1",
      "75001 Paris",
      "FRANCIA",
    ]);
  });

  it("remitente en una línea", () => {
    expect(senderLine(sender)).toBe("Comeco Gráfico · C. Meridiano, 19 · 28850 Torrejón de Ardoz (Madrid) · Tel. 916 76 75 04");
  });
});
