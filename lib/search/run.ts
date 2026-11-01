import "server-only";
import type { Profile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { buildUserPrompt, SYSTEM_PROMPT } from "./extract-prompt";
import { extract, llmConfigured } from "./llm";
import { normalizeQuery, type CompanySearchResponse, type CompanySearchResult, type SearchUsage } from "./schema";
import { searchWeb } from "./tavily";
import { verifyExtraction } from "./verify";

const CACHE_DAYS = 30;
const BURST_PER_MINUTE = 6;

export const searchConfigured = () => Boolean(process.env.TAVILY_API_KEY) && llmConfigured();

export async function getSearchUsage(): Promise<SearchUsage> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_usage_stats");
  const row = data?.[0];
  return { userToday: row?.user_today ?? 0, dailyLimit: row?.daily_limit ?? 0, teamMonth: row?.team_month ?? 0 };
}

/** Caché → cuota → Tavily → LLM → verificación → caché (§5.3). */
export async function runCompanySearch(profile: Profile, query: string): Promise<CompanySearchResponse> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const key = normalizeQuery(query);
  const log = (provider: string, cached: boolean) =>
    admin.from("search_usage").insert({ user_id: profile.id, query, provider, cached });

  // Ráfagas: también cuentan las búsquedas servidas desde la caché.
  const { count: lastMinute } = await supabase
    .from("search_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((lastMinute ?? 0) >= BURST_PER_MINUTE) {
    return { ok: false, message: "Demasiadas búsquedas seguidas. Espera un minuto." };
  }

  // 1. Caché (30 días): no gasta cuota.
  const { data: hit } = await supabase
    .from("company_search_cache")
    .select("result, provider")
    .eq("query_normalized", key)
    .gte("created_at", new Date(Date.now() - CACHE_DAYS * 86_400_000).toISOString())
    .maybeSingle();
  if (hit) {
    await log(hit.provider, true);
    return { ok: true, result: hit.result as unknown as CompanySearchResult, cached: true, usage: await getSearchUsage() };
  }

  if (!searchConfigured()) {
    return { ok: false, message: "El buscador aún no está configurado: faltan las claves de Tavily y Gemini/Groq." };
  }

  // 2. Cuota diaria por usuario (configurable en app_settings).
  const usage = await getSearchUsage();
  if (usage.userToday >= usage.dailyLimit) {
    return { ok: false, message: `Has llegado al límite de ${usage.dailyLimit} búsquedas de hoy.`, usage };
  }

  // 3. Búsqueda web.
  let pages;
  try {
    pages = await searchWeb(query);
  } catch (error) {
    console.error("[company-search] tavily", error);
    return { ok: false, message: "La búsqueda web no responde ahora mismo. Prueba en un rato.", usage };
  }
  if (!pages.length) {
    await log("tavily", false);
    return { ok: false, message: "No he encontrado nada en internet con esa búsqueda. Prueba con el nombre y la ciudad.", usage: await getSearchUsage() };
  }
  const sources = pages.map((p, i) => ({ n: i + 1, title: p.title, url: p.url }));
  const base = { query, sources, searchedAt: new Date().toISOString() };

  // 4. Extracción con IA + verificación contra los textos.
  let result: CompanySearchResult;
  try {
    const { data, provider } = await extract(SYSTEM_PROMPT, buildUserPrompt(query, pages));
    result = { ...verifyExtraction(data, pages), ...base, provider };
  } catch (error) {
    console.error("[company-search] llm", error);
    // Sin IA: al menos las fuentes, para revisarlas a mano. No se guarda en caché.
    await log("tavily", false);
    return {
      ok: true,
      cached: false,
      usage: await getSearchUsage(),
      result: { ...base, companyName: query, candidates: [], summary: "", provider: "tavily", degraded: true },
    };
  }

  // 5. Guardar en caché y contar la búsqueda.
  await Promise.all([
    admin
      .from("company_search_cache")
      .upsert(
        { query_normalized: key, result: result as unknown as Json, provider: result.provider, created_at: new Date().toISOString() },
        { onConflict: "query_normalized" },
      ),
    log(result.provider, false),
  ]);
  return { ok: true, result, cached: false, usage: await getSearchUsage() };
}
