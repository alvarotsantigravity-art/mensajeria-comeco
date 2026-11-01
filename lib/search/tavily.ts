import "server-only";
import { hasContactData } from "./verify";

export type WebResult = { title: string; url: string; content: string };

const ENDPOINT = "https://api.tavily.com/search";
const SNIPPET_MAX = 1500;
const RAW_MAX = 4000;

type TavilyResponse = {
  results?: Array<{ title?: string; url?: string; content?: string; raw_content?: string | null }>;
};

async function call(query: string, raw: boolean): Promise<WebResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Falta TAVILY_API_KEY.");

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      // Pistas para priorizar la web oficial, contacto y fichas de empresa.
      query: `${query} dirección código postal teléfono contacto`,
      search_depth: "basic",
      max_results: raw ? 5 : 8,
      include_answer: false,
      include_raw_content: raw ? "text" : false,
      include_images: false,
    }),
    signal: AbortSignal.timeout(7000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Tavily respondió ${response.status}.`);

  const data = (await response.json()) as TavilyResponse;
  return (data.results ?? [])
    .filter((r): r is { title?: string; url: string; content?: string; raw_content?: string | null } =>
      typeof r.url === "string" && /^https?:\/\//i.test(r.url),
    )
    .map((r) => ({
      title: (r.title ?? r.url).slice(0, 200),
      url: r.url,
      content: [r.content?.slice(0, SNIPPET_MAX), raw ? r.raw_content?.slice(0, RAW_MAX) : null].filter(Boolean).join("\n"),
    }));
}

/**
 * Búsqueda básica; solo si los fragmentos no traen ni CP ni teléfono se pide el
 * texto completo de las páginas (segunda llamada, otro crédito).
 */
export async function searchWeb(query: string): Promise<WebResult[]> {
  const results = await call(query, false);
  if (results.length && hasContactData(results)) return results;
  const withRaw = await call(query, true).catch(() => []);
  return withRaw.length ? withRaw : results;
}
