import { z } from "zod";
import { formatRequestDate } from "@/lib/email/build-body";

// Albarán de entrega (modelo docs/ALBARAN COMECO.pdf): datos, cálculos y validación.
// Seguro en cliente y servidor. Sin valorar: solo cantidades.

export const NOTE_UNITS = ["ej.", "cajas", "kg"] as const;
export type NoteUnit = (typeof NOTE_UNITS)[number];

/** Una hoja por copia, cada una con su casilla marcada. */
export const NOTE_COPIES = ["COPIA COMECO", "COPIA TRANSPORTISTA", "COPIA RECEPTOR"] as const;

/** Lo que maneja la pantalla: todo texto (los números se validan al guardar). */
export type NoteValues = {
  order_number: string;
  delivery_date: string; // AAAA-MM-DD
  origin: string;
  transport_mode: string;
  comment: string;
  quantity: string;
  unit: NoteUnit;
  concept: string;
  units_per_package: string;
  packages: string;
  packages_per_pallet: string;
  pallets: string;
};

export const NOTE_FIELDS = [
  "order_number",
  "delivery_date",
  "origin",
  "transport_mode",
  "comment",
  "quantity",
  "unit",
  "concept",
  "units_per_package",
  "packages",
  "packages_per_pallet",
  "pallets",
] as const satisfies readonly (keyof NoteValues)[];

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres.`);
const count = (message: string) => z.string().trim().regex(/^$|^\d{1,7}$/, message);

export const noteSchema = z.object({
  order_number: text(40),
  delivery_date: z.iso.date("Fecha no válida.").or(z.literal("")),
  origin: text(120),
  transport_mode: text(80),
  comment: text(500),
  // Cantidad con decimales para kg ("12,5" o "12.5"); ej. y cajas, enteros en la práctica.
  quantity: z.string().trim().regex(/^$|^\d{1,10}([.,]\d{1,2})?$/, "Cantidad no válida."),
  unit: z.enum(NOTE_UNITS),
  concept: text(200),
  units_per_package: count("Solo números enteros."),
  packages: count("Solo números enteros."),
  packages_per_pallet: count("Solo números enteros."),
  pallets: count("Solo números enteros."),
});

/** Lo que aporta la solicitud para rellenar el albarán la primera vez. */
export type NoteSource = {
  op: string | null;
  product: string | null;
  concept: string | null;
  description: string | null;
  observations: string | null;
  carrierName: string;
  pickupCompany: string | null;
  officeName: string;
  deliveryDate: string | null;
  requestDate: string;
  pallets: string | null;
  boxCount: number | null;
};

const s = (v: string | null | undefined) => (v ?? "").trim();
const firstLine = (v: string | null) => s(v).split("\n")[0] ?? "";

export function defaultNote(src: NoteSource): NoteValues {
  const pallets = Number.parseInt(s(src.pallets), 10);
  return {
    order_number: s(src.op),
    delivery_date: s(src.deliveryDate) || src.requestDate,
    origin: s(src.pickupCompany) || src.officeName,
    transport_mode: src.carrierName,
    comment: s(src.observations),
    quantity: "",
    unit: "ej.",
    concept: s(src.product) || s(src.concept) || firstLine(src.description),
    units_per_package: "",
    packages: src.boxCount ? String(src.boxCount) : "",
    packages_per_pallet: "",
    pallets: Number.isFinite(pallets) && pallets > 0 ? String(pallets) : "",
  };
}

export const parseQuantity = (v: string) => {
  const n = Number.parseFloat(v.trim().replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const parseCount = (v: string) => {
  const n = Number.parseInt(v.trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Paquetes = cantidad ÷ ejemplares por paquete; palés = paquetes ÷ paquetes por palé
 * (redondeando hacia arriba). Devuelve null si faltan datos para calcularlo.
 */
export function computePackages(v: Pick<NoteValues, "quantity" | "units_per_package">): number | null {
  const q = parseQuantity(v.quantity);
  const per = parseCount(v.units_per_package);
  return q !== null && per ? Math.ceil(q / per) : null;
}
export function computePallets(v: Pick<NoteValues, "packages" | "packages_per_pallet">): number | null {
  const packages = parseCount(v.packages);
  const per = parseCount(v.packages_per_pallet);
  return packages && per ? Math.ceil(packages / per) : null;
}

/** "6000" → "6.000"; "12.5" → "12,5" (formato español). */
export function formatQuantity(v: string): string {
  const n = parseQuantity(v);
  return n === null ? "" : new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2, useGrouping: true }).format(n);
}

/** "50 ejemplar(es)", "120 paquete(s)", "1 palé(s)", como en el modelo. */
export function plural(v: string, word: "ejemplar" | "paquete" | "palé") {
  const n = v.trim();
  return n ? `${n} ${word}(${word === "palé" ? "s" : word === "ejemplar" ? "es" : "s"})` : "";
}

/** Fila guardada (o nada) → valores de la pantalla. */
export function rowToNote(
  row: {
    order_number: string | null;
    delivery_date: string | null;
    origin: string | null;
    transport_mode: string | null;
    comment: string | null;
    quantity: number | null;
    unit: string;
    concept: string | null;
    units_per_package: number | null;
    packages: number | null;
    packages_per_pallet: number | null;
    pallets: number | null;
  },
): NoteValues {
  const num = (n: number | null) => (n === null ? "" : String(n));
  return {
    order_number: s(row.order_number),
    delivery_date: s(row.delivery_date),
    origin: s(row.origin),
    transport_mode: s(row.transport_mode),
    comment: s(row.comment),
    quantity: row.quantity === null ? "" : String(row.quantity).replace(".", ","),
    unit: (NOTE_UNITS as readonly string[]).includes(row.unit) ? (row.unit as NoteUnit) : "ej.",
    concept: s(row.concept),
    units_per_package: num(row.units_per_package),
    packages: num(row.packages),
    packages_per_pallet: num(row.packages_per_pallet),
    pallets: num(row.pallets),
  };
}

/** Valores validados → columnas de la tabla. */
export function noteToRow(v: z.output<typeof noteSchema>) {
  const nul = (x: string) => x || null;
  const int = (x: string) => (x ? Number.parseInt(x, 10) : null);
  return {
    order_number: nul(v.order_number),
    delivery_date: nul(v.delivery_date),
    origin: nul(v.origin),
    transport_mode: nul(v.transport_mode),
    comment: nul(v.comment),
    quantity: parseQuantity(v.quantity),
    unit: v.unit,
    concept: nul(v.concept),
    units_per_package: int(v.units_per_package),
    packages: int(v.packages),
    packages_per_pallet: int(v.packages_per_pallet),
    pallets: int(v.pallets),
  };
}

/** Valores de la URL del PDF (?campo=valor): lo que falte o no valga, del albarán base. */
export function noteFromParams(base: NoteValues, params: Record<string, string | undefined>): NoteValues {
  const merged = { ...base };
  for (const key of NOTE_FIELDS) {
    const value = params[key];
    if (value !== undefined) (merged as Record<string, string>)[key] = value;
  }
  const parsed = noteSchema.safeParse(merged);
  return parsed.success ? (parsed.data as NoteValues) : base;
}

export type NoteHeader = {
  ref: string;
  generated: string; // dd/mm/aaaa
  address: { company: string; address: string; place: string };
  legal: { name: string; address: string; taxId: string; waste: string; footer: string };
};

export const noteDate = (iso: string) => formatRequestDate(iso);
