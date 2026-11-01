import type { Extraction } from "./schema";

type Page = { url: string; content: string };

const digits = (s: string) => s.replace(/\D/g, "");

/** ¿Hay en los fragmentos algo con pinta de CP o teléfono español? */
export const hasContactData = (pages: Page[]) =>
  pages.some((p) => /\b\d{5}\b/.test(p.content) || /\b[6-9]\d{2}[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{0,3}\b/.test(p.content));
const sameUrl = (a: string, b: string) => a.replace(/\/+$/, "").toLowerCase() === b.replace(/\/+$/, "").toLowerCase();

/**
 * Red de seguridad sobre la salida del LLM: los teléfonos, CP y emails que no
 * aparezcan en el texto de los resultados se descartan, y solo se aceptan
 * fuentes que estén entre las URLs consultadas.
 */
export function verifyExtraction(data: Extraction, pages: Page[]): Extraction {
  const corpus = pages.map((p) => p.content).join("\n");
  const corpusDigits = digits(corpus);
  const corpusLower = corpus.toLowerCase();

  const candidates = data.candidates
    .map((c) => {
      const phoneDigits = c.phone ? digits(c.phone).replace(/^(0034|34)(?=\d{9}$)/, "") : "";
      const phone = phoneDigits.length >= 9 && corpusDigits.includes(phoneDigits) ? c.phone : null;
      const postalCode = c.postalCode && /^\d{5}$/.test(c.postalCode.trim()) && corpus.includes(c.postalCode.trim())
        ? c.postalCode.trim()
        : c.postalCode && !/^\d+$/.test(c.postalCode.trim()) && corpus.includes(c.postalCode.trim())
          ? c.postalCode.trim() // CP extranjeros (alfanuméricos), si aparecen tal cual
          : null;
      const email = c.email && corpusLower.includes(c.email.toLowerCase()) ? c.email : null;
      const website = c.website && /^https?:\/\//i.test(c.website) ? c.website : null;
      const sources = c.sources.filter((s) => pages.some((p) => sameUrl(p.url, s.url)));
      return { ...c, phone, postalCode, email, website, sources };
    })
    // Una sede sin ningún dato útil no aporta nada.
    .filter((c) => c.address || c.postalCode || c.phone || c.city);

  // El resumen solo puede citar resultados que existen.
  const summary = data.summary.replace(/\[(\d+)\]/g, (match, n) => (Number(n) >= 1 && Number(n) <= pages.length ? match : ""));
  return { ...data, candidates, summary };
}
