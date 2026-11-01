import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookUser, History, Package, Printer, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { listRecentRequests } from "@/lib/requests/data";
import { STATUS_LABEL, URGENCY_SHORT, type Status, type Urgency } from "@/lib/requests/options";
import { formatRequestDate } from "@/lib/email/build-body";
import { Badge, Card, Skeleton } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const shortcuts: { icon: typeof Search; title: string; text: string; href?: string; phase?: string }[] = [
  { icon: BookUser, title: "Libreta compartida", text: "Destinatarios de toda la oficina.", href: "/libreta" },
  { icon: History, title: "Historial", text: "Repite un envío en segundos.", href: "/historial" },
  { icon: Search, title: "Buscador de empresas", text: "Dirección, teléfono y contacto con fuentes.", phase: "Fase 6" },
  { icon: Printer, title: "Etiquetas", text: "PDF A4 para sobres y cajas.", phase: "Fase 7" },
];

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
        {shortcuts.map(({ icon: Icon, title, text, href, phase }) => {
          const content = (
            <Card className={cn("grid h-full gap-4", href && "transition-colors group-hover:border-ink/30")}>
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-4" />
                </span>
                {phase ? <Badge>{phase}</Badge> : <ArrowRight className="size-4 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />}
              </div>
              <div className="grid gap-1">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted">{text}</p>
              </div>
            </Card>
          );
          return href ? (
            <Link key={title} href={href} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {content}
            </Link>
          ) : (
            <div key={title}>{content}</div>
          );
        })}
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
