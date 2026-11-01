"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Check, Copy, ExternalLink, Globe, LoaderCircle, MapPin, Search, TriangleAlert, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, Skeleton } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import {
  CANDIDATE_FIELDS,
  FIELD_LABEL,
  type Candidate,
  type CandidateField,
  type CompanySearchResponse,
  type CompanySearchResult,
  type SearchSource,
  type SearchUsage,
} from "@/lib/search/schema";

/** Campos que tienen hueco en el bloque de destino del formulario. */
export const USABLE_FIELDS: Partial<Record<CandidateField, true>> = {
  address: true,
  postalCode: true,
  city: true,
  province: true,
  country: true,
  phone: true,
  contactPerson: true,
};

const CONFIDENCE_TONE = { alta: "success", media: "kraft", baja: "urgent" } as const;

/** Panel lateral "Buscar empresa en internet" (§5.3), estilo Perplexity. */
export function CompanySearchSheet({
  open,
  onOpenChange,
  initialQuery,
  onUse,
  onUseField,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery: string;
  onUse: (candidate: Candidate, companyName: string) => void;
  onUseField: (field: CandidateField, value: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompanySearchResult | null>(null);
  const [cached, setCached] = useState(false);
  const [usage, setUsage] = useState<SearchUsage | null>(null);
  const [configured, setConfigured] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Al abrir: consulta sugerida desde el formulario…
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open && !query.trim()) setQuery(initialQuery);
  }

  // …y contador del día.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/company-search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { configured: boolean; usage: SearchUsage } | null) => {
        if (cancelled || !data) return;
        setConfigured(data.configured);
        setUsage(data.usage);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function search(event?: React.FormEvent) {
    event?.preventDefault();
    event?.stopPropagation();
    const q = query.trim();
    if (q.length < 3 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await response.json()) as CompanySearchResponse;
      if (data.usage) setUsage(data.usage);
      if (!data.ok) {
        setError(data.message);
        return;
      }
      setResult(data.result);
      setCached(data.cached);
    } catch {
      setError("No se pudo completar la búsqueda. Revisa la conexión.");
    } finally {
      setLoading(false);
    }
  }

  const googleQuery = encodeURIComponent(result?.query ?? query);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] motion-safe:animate-fade-in" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-line bg-bg shadow-2xl outline-none motion-safe:animate-sheet-in"
        >
          <header className="grid gap-4 border-b border-line px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <Dialog.Title className="text-title font-semibold">Buscar empresa</Dialog.Title>
                <Dialog.Description className="text-sm text-muted">
                  Busca en internet la dirección, el CP y el teléfono, con sus fuentes.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Cerrar">
                  <X />
                </Button>
              </Dialog.Close>
            </div>
            <form onSubmit={search} className="relative" role="search">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                aria-label="Empresa y ciudad"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Iberdrola sede Bilbao"
                maxLength={200}
                className="h-12 w-full rounded-lg border border-line bg-surface pr-28 pl-11 text-base outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
              <Button type="submit" size="sm" disabled={loading || query.trim().length < 3} className="absolute top-1/2 right-2 -translate-y-1/2">
                {loading ? <LoaderCircle className="animate-spin" /> : null}
                Buscar
              </Button>
            </form>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted">
              {usage ? (
                <span>
                  {usage.userToday}/{usage.dailyLimit} hoy · {usage.teamMonth} este mes en la oficina
                </span>
              ) : null}
              <a href={`https://www.google.com/search?q=${googleQuery}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                <Globe className="size-3.5" /> Abrir en Google
              </a>
              <a href={`https://www.google.com/maps/search/${googleQuery}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
                <MapPin className="size-3.5" /> Ver en Google Maps
              </a>
            </div>
          </header>

          <div className="grid flex-1 content-start gap-6 overflow-y-auto px-6 py-6" aria-live="polite" aria-busy={loading}>
            {!configured ? (
              <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm">
                El buscador aún no está configurado (faltan las claves de Tavily y Gemini/Groq). Mientras, usa los enlaces de Google.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="rounded-lg border border-urgent/30 bg-urgent/8 px-4 py-3 text-sm">
                {error}
              </p>
            ) : null}
            {loading ? <ResultSkeleton /> : result ? (
              <Results result={result} cached={cached} onUse={onUse} onUseField={onUseField} />
            ) : !error ? (
              <p className="text-sm text-muted">
                Escribe el nombre de la empresa y la ciudad. Ejemplo: «Clínica San Rafael Madrid recepción».
              </p>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Results({
  result,
  cached,
  onUse,
  onUseField,
}: {
  result: CompanySearchResult;
  cached: boolean;
  onUse: (candidate: Candidate, companyName: string) => void;
  onUseField: (field: CandidateField, value: string) => void;
}) {
  return (
    <>
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{result.companyName}</h3>
          {cached ? <Badge>De la caché</Badge> : null}
        </div>
        {result.summary ? (
          <p className="leading-relaxed">
            <Cited text={result.summary} sources={result.sources} />
          </p>
        ) : null}
        <p className="flex items-center gap-2 text-sm text-muted">
          <TriangleAlert className="size-4 shrink-0 text-kraft" aria-hidden />
          {result.degraded
            ? "La IA no respondió: revisa las fuentes y copia los datos a mano."
            : "Verifica los datos antes de enviar."}
        </p>
      </section>

      {result.candidates.length ? (
        result.candidates.map((c, i) => (
          <CandidateCard key={i} candidate={c} companyName={result.companyName} sources={result.sources} onUse={onUse} onUseField={onUseField} />
        ))
      ) : !result.degraded ? (
        <p className="text-sm text-muted">Las fuentes no traen una dirección clara. Revisa los enlaces de abajo.</p>
      ) : null}

      <section className="grid gap-2">
        <h3 className="font-mono text-xs text-muted">Fuentes</h3>
        <ol className="grid gap-1.5 text-sm">
          {result.sources.map((s) => (
            <li key={s.n} id={`fuente-${s.n}`} className="flex gap-2">
              <span className="w-5 shrink-0 font-mono text-xs leading-5 text-muted">{s.n}</span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="min-w-0 hover:underline">
                <span className="line-clamp-1">{s.title}</span>
                <span className="line-clamp-1 font-mono text-xs text-muted">{hostOf(s.url)}</span>
              </a>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function CandidateCard({
  candidate,
  companyName,
  sources,
  onUse,
  onUseField,
}: {
  candidate: Candidate;
  companyName: string;
  sources: SearchSource[];
  onUse: (candidate: Candidate, companyName: string) => void;
  onUseField: (field: CandidateField, value: string) => void;
}) {
  const fields = CANDIDATE_FIELDS.filter((f) => candidate[f]);
  const sourceOf = (field: CandidateField) => {
    const url = candidate.sources.find((s) => s.field === field)?.url;
    return url ? sources.find((s) => s.url.replace(/\/+$/, "") === url.replace(/\/+$/, "")) : undefined;
  };

  return (
    <article className="grid gap-4 rounded-xl border border-line bg-surface p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-medium">{candidate.label}</h4>
        <Badge tone={CONFIDENCE_TONE[candidate.confidence]}>Confianza {candidate.confidence}</Badge>
      </header>
      <dl className="grid gap-2.5">
        {fields.map((field) => {
          const value = candidate[field] as string;
          const source = sourceOf(field);
          return (
            <div key={field} className="group grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-start gap-3">
              <dt className="pt-1 text-sm text-muted">{FIELD_LABEL[field]}</dt>
              <dd className={cn("min-w-0 pt-1 break-words", (field === "phone" || field === "postalCode" || field === "email") && "font-mono text-sm")}>
                {field === "website" ? (
                  <a href={value} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {hostOf(value)}
                  </a>
                ) : (
                  value
                )}
                {source ? (
                  <a href={`#fuente-${source.n}`} className="ml-1.5 align-super font-mono text-[9px] text-accent" title={source.title}>
                    [{source.n}]
                  </a>
                ) : null}
              </dd>
              <span className="flex gap-0.5">
                <CopyButton value={value} label={FIELD_LABEL[field]} />
                {USABLE_FIELDS[field] ? (
                  <Button type="button" variant="ghost" size="icon" className="size-8" aria-label={`Usar solo ${FIELD_LABEL[field].toLowerCase()}`} title="Usar solo este campo" onClick={() => onUseField(field, value)}>
                    <Wand2 className="size-3.5" />
                  </Button>
                ) : null}
              </span>
            </div>
          );
        })}
      </dl>
      <div>
        <Button type="button" onClick={() => onUse(candidate, companyName)}>
          Usar en el formulario
        </Button>
      </div>
    </article>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label={`Copiar ${label.toLowerCase()}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("No se pudo copiar.");
        }
      }}
    >
      {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </Button>
  );
}

/** Texto con citas [n] convertidas en enlaces a la fuente (sin HTML externo). */
function Cited({ text, sources }: { text: string; sources: SearchSource[] }) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const n = /^\[(\d+)\]$/.exec(part)?.[1];
    const source = n ? sources.find((s) => s.n === Number(n)) : undefined;
    if (!source) return <Fragment key={i}>{part}</Fragment>;
    return (
      <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title} className="mx-0.5 inline-flex items-center rounded bg-accent-soft px-1 align-baseline font-mono text-[10px] text-accent hover:underline">
        {source.n}
        <ExternalLink className="ml-0.5 size-2.5" aria-hidden />
      </a>
    );
  });
}

function ResultSkeleton() {
  return (
    <div className="grid gap-5" aria-label="Buscando…">
      <Skeleton className="h-6 w-1/2" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
