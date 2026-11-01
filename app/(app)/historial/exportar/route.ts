import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/requests/data";
import { buildHistoryCsv } from "@/lib/requests/csv";
import { exportHistory, parseHistoryFilters } from "@/lib/requests/history";

/** CSV del historial con los mismos filtros que la tabla (§5.5). */
export async function GET(request: NextRequest) {
  await requireUser();
  const filters = parseHistoryFilters(Object.fromEntries(request.nextUrl.searchParams));
  const csv = buildHistoryCsv(await exportHistory(filters));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="historial-mensajeria-${todayInMadrid()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
