/** Formatos A4 de §5.6. Medidas en mm; A4 = 210 × 297. */
export const PAGE = { width: 210, height: 297 } as const;

export const LABEL_FORMATS = {
  "1": { perPage: 1, cols: 1, rows: 1, name: "1 por hoja", hint: "A4 completo, cajas grandes" },
  "2": { perPage: 2, cols: 1, rows: 2, name: "2 por hoja", hint: "A5 (210 × 148,5 mm)" },
  "4": { perPage: 4, cols: 2, rows: 2, name: "4 por hoja", hint: "A6 (105 × 148 mm)" },
  "8": { perPage: 8, cols: 2, rows: 4, name: "8 por hoja", hint: "105 × 74 mm · Apli / Avery" },
} as const;

export type LabelFormat = keyof typeof LABEL_FORMATS;
export const FORMAT_KEYS = Object.keys(LABEL_FORMATS) as LabelFormat[];

export const isLabelFormat = (v: unknown): v is LabelFormat => typeof v === "string" && v in LABEL_FORMATS;

/** Tamaño de cada etiqueta: la hoja se reparte entera, sin márgenes (como las hojas adhesivas). */
export function cellSize(format: LabelFormat) {
  const { cols, rows } = LABEL_FORMATS[format];
  return { width: PAGE.width / cols, height: PAGE.height / rows };
}

/** Escala del texto según el tamaño de la etiqueta (8 por hoja = 1). */
export function fontScale(format: LabelFormat) {
  return { "1": 2.2, "2": 1.6, "4": 1.3, "8": 1 }[format];
}

export type Slot<T> = T | null;

/**
 * Coloca las etiquetas en hojas, en orden de lectura (izquierda→derecha,
 * arriba→abajo), empezando en la posición `start` (1‑based) de la primera hoja
 * para aprovechar hojas adhesivas ya usadas.
 */
export function planSheets<T>(labels: T[], format: LabelFormat, start = 1): Slot<T>[][] {
  const perPage = LABEL_FORMATS[format].perPage;
  const offset = Math.min(Math.max(1, Math.trunc(start) || 1), perPage) - 1;
  const slots: Slot<T>[] = [...Array<null>(offset).fill(null), ...labels];
  const pages: Slot<T>[][] = [];
  for (let i = 0; i < Math.max(slots.length, 1); i += perPage) {
    const page = slots.slice(i, i + perPage);
    while (page.length < perPage) page.push(null);
    pages.push(page);
  }
  return pages;
}

/** Desplazamiento de calibración (mm). Limitado para no sacar la hoja de la página. */
export type LabelOffsets = { top: number; left: number };
export const OFFSET_LIMIT = 10;

export function parseOffsets(raw: unknown): LabelOffsets {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const clamp = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(Math.min(OFFSET_LIMIT, Math.max(-OFFSET_LIMIT, n)) * 10) / 10 : 0;
  };
  return { top: clamp(o.top), left: clamp(o.left) };
}
