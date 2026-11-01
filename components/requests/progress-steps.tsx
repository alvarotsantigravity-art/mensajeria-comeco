import { Check } from "lucide-react";
import type { ShipmentProgress } from "@/hooks/use-shipment-progress";
import type { BlockKey } from "@/lib/requests/schema";
import { cn } from "@/lib/utils";

export const BLOCKS: { key: BlockKey; index: string; title: string; anchor: string }[] = [
  { key: "requester", index: "01", title: "Solicitante", anchor: "bloque-solicitante" },
  { key: "petition", index: "02", title: "Petición", anchor: "bloque-peticion" },
  { key: "destination", index: "03", title: "Destino", anchor: "bloque-destino" },
  { key: "service", index: "04", title: "Servicio", anchor: "bloque-servicio" },
];

/** Navegación 01–04: cada número pasa a ✓ cuando su bloque es válido (§6.3). */
export function ProgressSteps({ progress, sent }: { progress: ShipmentProgress; sent: boolean }) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{sent ? "Enviada" : "Progreso"}</span>
        <span className="font-mono">{progress.percent}%</span>
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la solicitud"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", sent ? "bg-success" : "bg-accent")}
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {BLOCKS.map((block) => {
          const done = progress.blocks[block.key];
          return (
            <li key={block.key}>
              <a
                href={`#${block.anchor}`}
                className="group grid gap-1.5 rounded-md py-1 text-sm outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border font-mono text-xs transition-colors",
                    done ? "border-accent bg-accent text-white" : "border-line text-muted group-hover:border-ink/30",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} aria-label="Completo" /> : block.index}
                </span>
                <span className={done ? "text-ink" : "text-muted"}>{block.title}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {`${progress.percent}% completado`}
      </p>
    </div>
  );
}
