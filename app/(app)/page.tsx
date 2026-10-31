import { Suspense } from "react";
import { BookUser, History, Package, Printer, Search } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { Badge, Card } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

const upcoming = [
  { icon: Package, title: "Nueva solicitud", text: "Formulario con vista previa y Gmail.", phase: "Fase 3" },
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
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" disabled title="Disponible en la Fase 3">
            <Package /> Nueva solicitud
          </Button>
          <span className="text-sm text-muted">El formulario llega en la Fase 3.</span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
