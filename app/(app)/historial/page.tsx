import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { listCarriers } from "@/lib/carriers/data";
import { HISTORY_PAGE_SIZE, listHistory, listRequesters, parseHistoryFilters } from "@/lib/requests/history";
import { STATUS_LABEL, STATUSES, URGENCIES, URGENCY_SHORT } from "@/lib/requests/options";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { ListSearch } from "@/components/list-search";
import { HistoryTable } from "./history-table";

export const metadata: Metadata = { title: "Historial" };

export default function HistoryPage({ searchParams }: PageProps<"/historial">) {
  return (
    <div className="grid gap-10">
      <header className="grid gap-4 pt-6">
        <span className="font-mono text-xs text-muted">Toda la oficina</span>
        <h1 className="animate-rise text-display font-semibold">Historial.</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <History searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function History({ searchParams }: Pick<PageProps<"/historial">, "searchParams">) {
  const profile = await requireUser();
  const params = await searchParams;
  const filters = parseHistoryFilters(params);
  const [{ rows, total }, requesters, carriers] = await Promise.all([listHistory(filters), listRequesters(), listCarriers()]);
  const carrierNames = Object.fromEntries(carriers.map((c) => [c.slug, c.name]));

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string" && key !== "pagina") query.set(key, value);
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    if (page > 1) next.set("pagina", String(page));
    return `/historial${next.size ? `?${next}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE));

  return (
    <div className="grid gap-6">
      <ListSearch
        placeholder="Busca por referencia, OP, producto, destino, ciudad o solicitante…"
        chips={[
          ...STATUSES.map((s) => ({ param: "estado", value: s, label: STATUS_LABEL[s] })),
          ...URGENCIES.map((u) => ({ param: "urgencia", value: u, label: URGENCY_SHORT[u] })),
        ]}
        selects={[
          {
            param: "proveedor",
            label: "Cualquier proveedor",
            options: carriers.map((c) => ({ value: c.slug, label: c.name })),
          },
          {
            param: "solicitante",
            label: "Cualquier solicitante",
            options: requesters.map((r) => ({ value: r.id, label: r.id === profile.id ? `${r.full_name} (yo)` : r.full_name })),
          },
        ]}
        dates={[
          { param: "desde", label: "Desde" },
          { param: "hasta", label: "Hasta" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {total === 1 ? "1 solicitud" : `${total} solicitudes`}
          {pages > 1 ? ` · página ${filters.page} de ${pages}` : ""}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={`/historial/exportar${query.size ? `?${query}` : ""}`} download>
            <Download /> Exportar CSV
          </a>
        </Button>
      </div>

      <HistoryTable rows={rows} currentUserId={profile.id} isAdmin={profile.role === "admin"} carrierNames={carrierNames} />

      {pages > 1 ? (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-2">
          {filters.page > 1 ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(filters.page - 1)}>Anterior</Link>
            </Button>
          ) : null}
          <span className="font-mono text-xs text-muted">
            {filters.page} / {pages}
          </span>
          {filters.page < pages ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={pageHref(filters.page + 1)}>Siguiente</Link>
            </Button>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
