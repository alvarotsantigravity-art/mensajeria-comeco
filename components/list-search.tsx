"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Chip = { param: string; value: string; label: string };
type Select = { param: string; label: string; options: { value: string; label: string }[] };
type DateFilter = { param: string; label: string };

/**
 * Buscador grande + filtros como chips (§6.3). Todo vive en la URL para que los
 * resultados se puedan compartir y el servidor los lea; el texto va con debounce.
 */
export function ListSearch({
  placeholder,
  chips = [],
  selects = [],
  dates = [],
}: {
  placeholder: string;
  chips?: Chip[];
  selects?: Select[];
  dates?: DateFilter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const lastPushed = useRef(params.get("q") ?? "");

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("pagina");
    const search = next.toString();
    startTransition(() => router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (q.trim() === lastPushed.current) return;
    const timer = setTimeout(() => {
      lastPushed.current = q.trim();
      update({ q: q.trim() || null });
    }, 250);
    return () => clearTimeout(timer);
    // update depende de params; solo reaccionamos al texto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = (chip: Chip) => params.get(chip.param) === chip.value;
  const hasFilters = [...chips.map((c) => c.param), ...selects.map((s) => s.param), ...dates.map((d) => d.param)].some((p) =>
    params.has(p),
  );

  return (
    <div className="grid gap-4">
      <label className="relative block">
        <span className="sr-only">Buscar</span>
        {pending ? (
          <LoaderCircle className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 animate-spin text-muted" aria-hidden />
        ) : (
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
        )}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-14 w-full rounded-xl border border-line bg-surface pr-4 pl-12 text-lg outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
      </label>

      {chips.length || selects.length || dates.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={`${chip.param}=${chip.value}`}
              type="button"
              aria-pressed={active(chip)}
              onClick={() => update({ [chip.param]: active(chip) ? null : chip.value })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                active(chip) ? "border-ink bg-ink text-bg" : "border-line text-muted hover:border-ink/40 hover:text-ink",
              )}
            >
              {chip.label}
            </button>
          ))}
          {selects.map((select) => (
            <label key={select.param} className="text-sm">
              <span className="sr-only">{select.label}</span>
              <select
                value={params.get(select.param) ?? ""}
                onChange={(e) => update({ [select.param]: e.target.value || null })}
                className="h-9 rounded-full border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">{select.label}</option>
                {select.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {dates.map((d) => (
            <label key={d.param} className="flex items-center gap-2 text-sm text-muted">
              {d.label}
              <input
                type="date"
                value={params.get(d.param) ?? ""}
                onChange={(e) => update({ [d.param]: e.target.value || null })}
                className="h-9 rounded-full border border-line bg-surface px-3 font-mono text-xs text-ink outline-none focus:border-accent"
              />
            </label>
          ))}
          {hasFilters ? (
            <button
              type="button"
              onClick={() => update(Object.fromEntries([...chips, ...selects, ...dates].map((f) => [f.param, null])))}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-muted hover:text-ink"
            >
              <X className="size-3.5" /> Quitar filtros
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
