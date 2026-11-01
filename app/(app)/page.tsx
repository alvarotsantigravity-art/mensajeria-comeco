import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookUser, History, Package, Printer, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { listRecentRequests } from "@/lib/requests/data";
import { STATUS_LABEL, URGENCY_SHORT, type Status, type Urgency } from "@/lib/requests/options";
import { formatRequestDate } from "@/lib/email/build-body";
import { Badge, Card, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

const upcoming = [
  { icon: Search, title: "Buscador de empresas", text: "Dirección, teléfono y contacto con fuentes.", phase: "Fase 6" },
  { icon: BookUser, title: "Libreta compartida", text: "Destinatarios de toda la oficina.", phase: "Fase 5" },
  { icon: History, title: "Historial", text: "Repite un envío en segundos.", phase: "Fase 5" },
  { icon: Printer, title: "Etiquetas", text: "PDF A4 para sobres y cajas.", phase: "Fase 7" },
] as const;

export default function HomePage() {
  return (
    <div className="grid gap-16">
      <section className="grid gap-6 pt-6">
        <span className="font-mono text-xs text-muted">Inicio</span>
        <h1 className="animate-rise text-display font-semibold">
          <Suspense fallback={<span className="text-muted">Hola.</span>}>
            <Greeting />
          </Suspense>
        </h1>
        <div>
          <Button size="lg" asChild>
            <Link href="/solicitudes/nueva">
              <Package /> Nueva solicitud
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4">
        <h2 className="font-mono text-xs text-muted">Últimas solicitudes de la oficina</h2>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <RecentRequests />
        </Suspense>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {upcoming.map(({ icon: Icon, title, text, phase }) => (
          <Card key={title} className="grid gap-4">
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-full bg-surface-2">
                <Icon className="size-4" />
              </span>
              <Badge>{phase}</Badge>
            </div>
            <div className="grid gap-1">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted">{text}</p>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}

async function Greeting() {
  const profile = await requireUser();
  const firstName = profile.full_name.split(" ")[0];
  return <>Hola{firstName ? `, ${firstName}` : ""}.</>;
}

async function RecentRequests() {
  await requireUser();
  const requests = await listRecentRequests();

  if (!requests.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-10 text-center text-muted">
        Aún no hay solicitudes. La primera que crees aparecerá aquí.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/solicitudes/${r.id}`}
            className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-4 outline-none hover:bg-surface-2/60 focus-visible:bg-surface-2/60 sm:grid-cols-[8.5rem_1fr_auto_auto]"
          >
            <span className="font-mono text-xs text-muted">{r.ref}</span>
            <span className="col-span-2 truncate font-medium sm:col-span-1">
              {r.dest_company || <span className="text-muted">Sin destino</span>}
              {r.dest_city ? <span className="font-normal text-muted"> · {r.dest_city}</span> : null}
            </span>
            <span className="flex items-center gap-2 text-sm text-muted">
              {r.urgency === "urgente" ? <Badge tone="urgent">{URGENCY_SHORT[r.urgency as Urgency]}</Badge> : null}
              <Badge tone={r.status === "borrador" ? "neutral" : "success"}>{STATUS_LABEL[r.status as Status]}</Badge>
            </span>
            <span className="flex items-center gap-3 text-sm text-muted">
              <span className="hidden sm:inline">{r.requester_name.split(" ")[0]}</span>
              <span className="font-mono text-xs">{formatRequestDate(r.request_date)}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
