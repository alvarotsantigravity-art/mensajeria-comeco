import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getLabelSettings, getLabelSource, parseTarget } from "@/lib/labels/source";
import { listRecentRequests } from "@/lib/requests/data";
import { formatRequestDate } from "@/lib/email/build-body";
import { Skeleton } from "@/components/ui/misc";
import { LabelStudio } from "./label-studio";

export const metadata: Metadata = { title: "Etiquetas" };

export default function LabelsPage({ searchParams }: PageProps<"/etiquetas">) {
  return (
    <div className="grid gap-10">
      <header className="grid gap-4 pt-6">
        <span className="font-mono text-xs text-muted">Etiquetas</span>
        <h1 className="animate-rise text-display font-semibold">Etiquetas.</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <Labels searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Labels({ searchParams }: Pick<PageProps<"/etiquetas">, "searchParams">) {
  const profile = await requireUser();
  const params = await searchParams;
  const target = parseTarget(params);
  if (!target) return <Chooser />;

  const [source, settings] = await Promise.all([getLabelSource(target), getLabelSettings()]);
  if (!source) notFound();

  return (
    <LabelStudio
      // Otra solicitud → otro estado inicial.
      key={`${target.kind}-${target.id}`}
      target={target}
      source={source}
      sender={settings.sender}
      initialOffsets={settings.offsets}
      isAdmin={profile.role === "admin"}
    />
  );
}

/** Sin solicitud elegida: las últimas de la oficina y un atajo a la libreta. */
async function Chooser() {
  const requests = await listRecentRequests(12);
  return (
    <section className="grid max-w-3xl gap-4">
      <p className="text-muted">
        Elige una solicitud para imprimir sus etiquetas, o abre la{" "}
        <Link href="/libreta" className="text-ink underline underline-offset-4">
          libreta
        </Link>{" "}
        para una etiqueta suelta.
      </p>
      {requests.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/etiquetas?solicitud=${r.id}`}
                className="group grid grid-cols-[8.5rem_1fr_auto] items-center gap-4 px-5 py-4 outline-none hover:bg-surface-2/60 focus-visible:bg-surface-2/60"
              >
                <span className="font-mono text-xs text-muted">{r.ref}</span>
                <span className="truncate font-medium">
                  {r.dest_company || <span className="text-muted">Sin destino</span>}
                  {r.dest_city ? <span className="font-normal text-muted"> · {r.dest_city}</span> : null}
                </span>
                <span className="flex items-center gap-3 text-sm text-muted">
                  <span className="font-mono text-xs">{formatRequestDate(r.request_date)}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-muted">Aún no hay solicitudes.</p>
      )}
    </section>
  );
}
