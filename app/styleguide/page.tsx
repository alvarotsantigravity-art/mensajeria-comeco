import type { Metadata } from "next";
import { Check, Copy, Mail, Package, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Alert, Badge, Card, SectionHeading, Separator, Skeleton } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { Marquee } from "@/components/motion/marquee";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Guía de estilo" };

const colors = [
  ["--bg", "Fondo"],
  ["--surface", "Superficie"],
  ["--surface-2", "Superficie 2"],
  ["--ink", "Texto"],
  ["--muted", "Secundario"],
  ["--line", "Bordes"],
  ["--accent", "Acento"],
  ["--kraft", "Cartón"],
  ["--tape", "Precinto"],
  ["--urgent", "Urgente"],
  ["--success", "Completado"],
] as const;

export default function StyleguidePage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:px-8 lg:px-12">
      <header className="flex items-start justify-between gap-6">
        <div className="grid gap-4">
          <span className="font-mono text-xs text-muted">Design system · v0.1</span>
          <h1 className="animate-rise text-display font-semibold">Guía de estilo.</h1>
          <p className="max-w-xl text-lg text-muted">
            Limpio, sereno y rápido. La jerarquía la marcan la tipografía y el espacio; el
            protagonismo visual será de la escena 3D.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Marquee
        items={["Solicitar", "Embalar", "Etiquetar", "Enviar"]}
        className="my-14 border-y border-line py-4 font-mono text-sm text-muted"
      />

      <div className="grid gap-20">
        <section className="grid gap-8">
          <SectionHeading index="01" title="Color" description="Variables CSS en :root, con versión oscura." />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {colors.map(([token, name]) => (
              <div key={token} className="grid gap-2">
                <div
                  className="h-20 rounded-lg border border-line"
                  style={{ background: `var(${token})` }}
                />
                <div className="text-sm font-medium">{name}</div>
                <code className="font-mono text-xs text-muted">{token}</code>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-8">
          <SectionHeading index="02" title="Tipografía" description="Geist Sans para texto y titulares, Geist Mono para datos." />
          <div className="grid gap-6">
            <p className="text-display font-semibold">Envía en segundos.</p>
            <p className="text-title font-semibold">Información del destino</p>
            <p className="max-w-prose">
              Texto de cuerpo a 15 px con interlineado 1,5. Escribe aquí qué se envía, el
              contenido, el peso estimado o instrucciones especiales.
            </p>
            <p className="font-mono text-sm text-muted">MSJ-2026-0001 · CECO 2690600250 · CP 28850</p>
          </div>
        </section>

        <section className="grid gap-8">
          <SectionHeading index="03" title="Botones" />
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Mail /> Abrir en Gmail
            </Button>
            <Button variant="ink">
              <Package /> Nueva solicitud
            </Button>
            <Button variant="outline">
              <Printer /> Imprimir etiquetas
            </Button>
            <Button variant="ghost">
              <Copy /> Copiar
            </Button>
            <Button variant="danger">Cancelar envío</Button>
            <Button variant="link">Ver historial</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeño</Button>
            <Button size="md">Mediano</Button>
            <Button size="lg">Grande</Button>
            <Button size="icon" variant="outline" aria-label="Buscar">
              <Search />
            </Button>
          </div>
        </section>

        <section className="grid gap-8">
          <SectionHeading index="04" title="Formularios" />
          <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
            <Field label="Empresa destinataria" htmlFor="sg-company" hint="Busca en la libreta o en internet.">
              <Input id="sg-company" placeholder="Iberdrola, S.A." />
            </Field>
            <Field label="Código postal" htmlFor="sg-cp" error="El código postal debe tener 5 dígitos.">
              <Input id="sg-cp" defaultValue="2885" aria-invalid aria-describedby="sg-cp-error" className="font-mono" />
            </Field>
            <Field label="Descripción del envío" htmlFor="sg-desc" className="sm:col-span-2">
              <Textarea id="sg-desc" placeholder="Qué se envía, contenido, peso estimado o instrucciones especiales" />
            </Field>
          </div>
        </section>

        <section className="grid gap-8">
          <SectionHeading index="05" title="Tarjetas, badges y avisos" />
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">MSJ-2026-0042</span>
                <Badge tone="urgent">Urgente</Badge>
              </div>
              <p className="text-lg font-semibold">Notaría López</p>
              <p className="text-sm text-muted">C. de Alcalá, 120 · 28009 Madrid</p>
            </Card>
            <Card className="grid gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted">MSJ-2026-0041</span>
                <Badge tone="success">
                  <Check className="size-3" /> Entregada
                </Badge>
              </div>
              <p className="text-lg font-semibold">Vocento</p>
              <p className="text-sm text-muted">C. Meridiano, 19 · 28850 Torrejón de Ardoz</p>
            </Card>
            <Card className="grid gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
            </Card>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Borrador</Badge>
            <Badge tone="accent">Enviada</Badge>
            <Badge tone="success">Entregada</Badge>
            <Badge tone="urgent">Urgente</Badge>
            <Badge tone="kraft">3 cajas</Badge>
          </div>
          <div className="grid max-w-3xl gap-3">
            <Alert>Verifica los datos antes de enviar.</Alert>
            <Alert tone="success">Solicitud guardada.</Alert>
            <Alert tone="error">No se ha podido guardar. Inténtalo de nuevo.</Alert>
          </div>
        </section>

        <section className="grid gap-8">
          <SectionHeading index="06" title="Tabla" />
          <Table>
            <thead>
              <tr>
                <Th>Ref.</Th>
                <Th>Destinatario</Th>
                <Th>Fecha</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <Td className="font-mono text-xs">MSJ-2026-0042</Td>
                <Td className="font-medium">Notaría López</Td>
                <Td className="font-mono text-xs">31/10/2026</Td>
                <Td>
                  <Badge tone="accent">Enviada</Badge>
                </Td>
              </tr>
              <tr>
                <Td className="font-mono text-xs">MSJ-2026-0041</Td>
                <Td className="font-medium">Vocento</Td>
                <Td className="font-mono text-xs">30/10/2026</Td>
                <Td>
                  <Badge tone="success">Entregada</Badge>
                </Td>
              </tr>
            </tbody>
          </Table>
        </section>

        <Separator />
        <p className="pb-10 font-mono text-xs text-muted">Comeco Gráfico · Mensajería</p>
      </div>
    </main>
  );
}
