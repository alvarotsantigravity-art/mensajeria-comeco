import { z } from "zod";

/** Entrada del buscador (§5.3). */
export const searchQuerySchema = z.object({
  query: z.string({ error: "Escribe qué empresa buscas." }).trim().min(3, "Escribe al menos 3 caracteres.").max(200, "Máximo 200 caracteres."),
});

const text = z
  .string()
  .nullish()
  .transform((v) => (v?.trim() ? v.trim() : null));

export const CANDIDATE_FIELDS = [
  "address",
  "postalCode",
  "city",
  "province",
  "country",
  "phone",
  "email",
  "contactPerson",
  "website",
] as const;
export type CandidateField = (typeof CANDIDATE_FIELDS)[number];

/** JSON estricto que debe devolver el LLM. Lo que no encaje, se descarta. */
export const extractionSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  candidates: z
    .array(
      z.object({
        label: z.string().trim().max(120).catch("Sede"),
        address: text,
        postalCode: text,
        city: text,
        province: text,
        country: text,
        phone: text,
        email: text,
        contactPerson: text,
        website: text,
        sources: z.array(z.object({ field: z.string(), url: z.string() })).catch([]),
        confidence: z.enum(["alta", "media", "baja"]).catch("baja"),
      }),
    )
    .max(6),
  summary: z.string().trim().max(1200).catch(""),
});
export type Extraction = z.infer<typeof extractionSchema>;
export type Candidate = Extraction["candidates"][number];

export type SearchSource = { n: number; title: string; url: string };
export type SearchProvider = "gemini" | "groq" | "tavily";

/** Lo que recibe la interfaz (y lo que se guarda en caché). */
export type CompanySearchResult = Extraction & {
  query: string;
  sources: SearchSource[];
  provider: SearchProvider;
  searchedAt: string;
  /** Sin datos estructurados: la IA no respondió y solo hay fuentes. */
  degraded?: boolean;
};

export type SearchUsage = { userToday: number; dailyLimit: number; teamMonth: number };

export type CompanySearchResponse =
  | { ok: true; result: CompanySearchResult; cached: boolean; usage: SearchUsage }
  | { ok: false; message: string; usage?: SearchUsage };

export const FIELD_LABEL: Record<CandidateField, string> = {
  address: "Dirección",
  postalCode: "Código postal",
  city: "Ciudad",
  province: "Provincia",
  country: "País",
  phone: "Teléfono",
  email: "Email",
  contactPerson: "Contacto",
  website: "Web",
};

/** Misma consulta escrita distinto → misma entrada de caché. */
export function normalizeQuery(query: string) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Acepta el JSON aunque venga envuelto en ```json … ```. */
export function parseExtraction(raw: string): Extraction {
  const json = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return extractionSchema.parse(JSON.parse(json));
}
