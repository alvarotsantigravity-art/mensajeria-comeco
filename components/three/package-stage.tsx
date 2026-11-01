"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PackageIllustration } from "./package-illustration";
import { STAGE_LABELS, type PackageVariant, type ScenePart } from "./scene-params";

type StageInfo = { stage: number; variant: PackageVariant };
const PlaceholderContext = createContext<StageInfo | null>(null);

function Placeholder() {
  const info = useContext(PlaceholderContext);
  return info ? <PackageIllustration {...info} /> : null;
}

// Carga diferida: el formulario es usable antes de que llegue el chunk 3D.
const PackageScene = dynamic(() => import("./package-scene"), { ssr: false, loading: Placeholder });

// ---------------------------------------------------------------------------
// Detección (cliente): movimiento reducido y soporte de WebGL.
// ---------------------------------------------------------------------------
const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const getReduced = () => window.matchMedia(reducedQuery).matches;

let webglSupport: boolean | null = null;
function hasWebGL() {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noop = () => () => {};

export function PackageStage({
  stage,
  variant,
  jump,
  onPart,
  onLabelHover,
  forceStatic = false,
  className,
}: {
  stage: number;
  variant: PackageVariant;
  jump?: boolean;
  onPart?: (part: ScenePart) => void;
  onLabelHover?: (hovered: boolean) => void;
  /** Para el laboratorio: forzar la ilustración estática. */
  forceStatic?: boolean;
  className?: string;
}) {
  // En el servidor: ilustración (sin animación ni WebGL).
  const reduced = useSyncExternalStore(subscribeReduced, getReduced, () => true);
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const use3d = webgl && !reduced && !forceStatic;
  const boxes = variant.shipmentType === "caja" ? variant.boxCount : 1;

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl text-ink">
        <PlaceholderContext.Provider value={{ stage, variant }}>
          {use3d ? (
            <PackageScene stage={stage} variant={variant} jump={jump} onPart={onPart} onLabelHover={onLabelHover} />
          ) : (
            <PackageIllustration stage={stage} variant={variant} />
          )}
        </PlaceholderContext.Provider>

        {boxes > 1 && stage >= 2 ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 font-mono text-xs text-bg">×{boxes}</span>
        ) : null}
        <span
          className={cn(
            "absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1 text-xs font-medium text-success-ink transition-all duration-500",
            stage >= 5 ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
          )}
          aria-hidden={stage < 5}
        >
          <Check className="size-3.5" strokeWidth={3} /> Paquete listo
        </span>
      </div>

      {/* Barra de progreso con 5 hitos */}
      <ol className="grid grid-cols-5 gap-2" aria-label="Etapas del paquete">
        {STAGE_LABELS.slice(1).map((label, i) => {
          const done = stage >= i + 1;
          return (
            <li key={label} className="grid gap-1.5">
              <span className={cn("h-1 rounded-full transition-colors duration-500", done ? "bg-accent" : "bg-line")} />
              <span className={cn("text-[10px] sm:text-xs", done ? "text-ink" : "text-muted")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {`Paquete: ${STAGE_LABELS[Math.max(0, Math.min(5, stage))]}`}
      </p>
    </div>
  );
}
