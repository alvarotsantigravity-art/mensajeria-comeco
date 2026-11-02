import { describe, expect, test } from "vitest";
import {
  computePackages,
  computePallets,
  defaultNote,
  formatQuantity,
  noteFromParams,
  noteSchema,
  noteToRow,
  plural,
  rowToNote,
  type NoteSource,
} from "@/lib/delivery-notes/note";

const transport: NoteSource = {
  op: "2601494",
  product: "REVISTA FIESTAS DE VALLADOLID 2026",
  concept: null,
  description: null,
  observations: null,
  carrierName: "BOYACA",
  pickupCompany: "ADACCA",
  officeName: "Comeco Gráfico",
  deliveryDate: "2026-08-27",
  requestDate: "2026-08-26",
  pallets: "1",
  boxCount: null,
};

describe("albarán por defecto (desde la solicitud)", () => {
  test("transporte: OP, origen, proveedor, fecha de entrega, producto y palés", () => {
    expect(defaultNote(transport)).toMatchObject({
      order_number: "2601494",
      origin: "ADACCA",
      transport_mode: "BOYACA",
      delivery_date: "2026-08-27",
      concept: "REVISTA FIESTAS DE VALLADOLID 2026",
      unit: "ej.",
      pallets: "1",
    });
  });

  test("mensajería: sin OP, origen la oficina, fecha de la solicitud y concepto", () => {
    const note = defaultNote({
      ...transport,
      op: null,
      product: null,
      concept: "Pruebas de color",
      pickupCompany: null,
      carrierName: "Mensajería interna",
      deliveryDate: null,
      pallets: null,
      boxCount: 3,
    });
    expect(note).toMatchObject({
      order_number: "",
      origin: "Comeco Gráfico",
      transport_mode: "Mensajería interna",
      delivery_date: "2026-08-26",
      concept: "Pruebas de color",
      packages: "3",
      pallets: "",
    });
  });
});

describe("cálculos del modelo (6.000 ej. · 50 por paquete · 120 por palé)", () => {
  test("paquetes y palés, redondeando hacia arriba", () => {
    expect(computePackages({ quantity: "6000", units_per_package: "50" })).toBe(120);
    expect(computePallets({ packages: "120", packages_per_pallet: "120" })).toBe(1);
    expect(computePackages({ quantity: "6001", units_per_package: "50" })).toBe(121);
    expect(computePallets({ packages: "121", packages_per_pallet: "120" })).toBe(2);
  });

  test("sin datos suficientes no calcula", () => {
    expect(computePackages({ quantity: "", units_per_package: "50" })).toBeNull();
    expect(computePallets({ packages: "120", packages_per_pallet: "" })).toBeNull();
  });

  test("formato español y plurales como en el modelo", () => {
    expect(formatQuantity("6000")).toBe("6.000");
    expect(formatQuantity("12,5")).toBe("12,5");
    expect(plural("50", "ejemplar")).toBe("50 ejemplar(es)");
    expect(plural("120", "paquete")).toBe("120 paquete(s)");
    expect(plural("1", "palé")).toBe("1 palé(s)");
    expect(plural("", "palé")).toBe("");
  });
});

describe("validación y guardado", () => {
  const values = { ...defaultNote(transport), quantity: "6000", units_per_package: "50", packages: "120", packages_per_pallet: "120" };

  test("los datos del modelo son válidos y se guardan como números", () => {
    const parsed = noteSchema.parse(values);
    expect(noteToRow(parsed)).toMatchObject({ quantity: 6000, units_per_package: 50, packages: 120, packages_per_pallet: 120, pallets: 1, unit: "ej." });
  });

  test("kg con decimales; unidades fuera de lista, no", () => {
    expect(noteToRow(noteSchema.parse({ ...values, quantity: "12,5", unit: "kg" })).quantity).toBe(12.5);
    expect(noteSchema.safeParse({ ...values, unit: "litros" }).success).toBe(false);
    expect(noteSchema.safeParse({ ...values, packages: "1,5" }).success).toBe(false);
  });

  test("fila guardada → pantalla (decimales con coma)", () => {
    const row = { ...noteToRow(noteSchema.parse({ ...values, quantity: "12,5", unit: "kg" })) };
    expect(rowToNote(row)).toMatchObject({ quantity: "12,5", unit: "kg", packages: "120" });
  });

  test("la URL del PDF solo cambia lo que viene y es válido", () => {
    expect(noteFromParams(values, { quantity: "100", unit: "cajas" })).toMatchObject({ quantity: "100", unit: "cajas", concept: values.concept });
    expect(noteFromParams(values, { unit: "litros" })).toEqual(values);
  });
});
