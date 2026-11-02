import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { getDeliveryNote } from "@/lib/delivery-notes/source";
import { listRecentRequests } from "@/lib/requests/data";
import { formatRequestDate } from "@/lib/email/build-body";
import { Skeleton } from "@/components/ui/misc";
import { NoteStudio } from "./note-studio";

export const metadata: Metadata = { title: "Albaranes" };

export default function DeliveryNotesPage({ searchParams }: PageProps<"/albaranes">) {
  return (
    <div className="grid gap-10">
      <header className="grid gap-4 pt-6">
        <span className="font-mono text-xs text-muted">Albaranes</span>
        <h1 className="animate-rise text-display font-semibold">Albaranes.</h1>
      </header>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <Notes searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Notes({ searchParams }: Pick<PageProps<"/albaranes">, "searchParams">) {
  const profile = await requireUser();
  const params = await searchParams;
  const id = z.uuid().safeParse(typeof params.solicitud === "string" ? params.solicitud : undefined);
  if (!id.success) return <Chooser />;

  const note = await getDeliveryNote(id.data);
  if (!note) notFound();

  return (
    <NoteStudio
      key={note.requestId}
      requestId={note.requestId}
      title={note.title}
      header={note.header}
      initialValues={note.values}
      saved={note.saved}
      editable={profile.role === "admin" || note.requesterId === profile.id}
    />
  );
}

/** Sin solicitud elegida: las últimas de la oficina. */
async function Chooser() {
  const requests = await listRecentRequests(12);
  return (
    <section className="grid max-w-3xl gap-4">
      <p className="text-muted">Elige una solicitud para preparar e imprimir su albarán de entrega.</p>
      {requests.length ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/albaranes?solicitud=${r.id}`}
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
