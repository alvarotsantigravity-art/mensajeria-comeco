import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { getSearchUsage, runCompanySearch, searchConfigured } from "@/lib/search/run";
import { searchQuerySchema, type CompanySearchResponse } from "@/lib/search/schema";

/** Contador para el panel: búsquedas de hoy, límite y si hay claves. */
export async function GET() {
  await requireUser();
  return NextResponse.json(
    { configured: searchConfigured(), usage: await getSearchUsage() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Buscador de empresas (§5.3). Las claves solo viven aquí, en el servidor. */
export async function POST(request: Request) {
  const profile = await requireUser();

  const body = await request.json().catch(() => null);
  const parsed = searchQuerySchema.safeParse(body);
  if (!parsed.success) {
    const message = z.flattenError(parsed.error).fieldErrors.query?.[0] ?? "Consulta no válida.";
    return NextResponse.json<CompanySearchResponse>({ ok: false, message }, { status: 400 });
  }

  try {
    const response = await runCompanySearch(profile, parsed.data.query);
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[company-search]", error);
    return NextResponse.json<CompanySearchResponse>({ ok: false, message: "Error inesperado en el buscador." }, { status: 500 });
  }
}
