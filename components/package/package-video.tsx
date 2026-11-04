"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// La caja del formulario es un vídeo con dos versiones, una por tema (public/caja): cada
// bloque completo hace avanzar el vídeo hasta la fase siguiente y se para ahí. Con los
// cuatro bloques completos la caja sale de escena sola, antes de abrir Gmail en otra pestaña.

export type PackageVariant = { boxCount: number };

export const STAGE_LABELS = ["Inicio", "Montaje", "Etiqueta", "Precinto", "Pegatinas y salida", "Enviado"] as const;

type Theme = "light" | "dark";

/** `stops`: segundo en el que se para cada etapa 0–3. `goneAt`: la caja ya ha salido del encuadre. */
const VIDEOS: Record<Theme, { src: string; stops: number[]; goneAt: number }> = {
  light: { src: "/caja/caja.mp4", stops: [0, 1.2, 3.8, 5.75], goneAt: 9.6 },
  dark: { src: "/caja/caja-oscuro.mp4", stops: [0, 1, 3.8, 6.1], goneAt: 9.8 },
};

/** La caja terminada y quieta: al reabrir una solicitud, no la mesa vacía. */
const FINISHED_STILL = 8.2;
const ALL_BLOCKS_DONE = 4;
const SENT = 5;

const WHITE_BACKGROUND_FILTER = "caja-fondo-blanco";

/**
 * El vídeo se funde con el fondo de la app. Oscuro: "lighten" convierte su negro en el fondo.
 * Claro: el filtro blanquea el gris y "multiply" convierte ese blanco en el fondo.
 * En los dos, los bordes del encuadre se difuminan.
 */
const BLEND =
  "mix-blend-multiply [filter:url(#caja-fondo-blanco)] dark:mix-blend-lighten dark:[filter:none] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent),linear-gradient(to_bottom,transparent,black_6%,black_90%,transparent)] [mask-composite:intersect]";

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const useReducedMotion = () => useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => true);

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
/** null hasta hidratar: en el servidor no se sabe el tema y no hay que descargar el vídeo equivocado. */
const useTheme = () =>
  useSyncExternalStore<Theme | null>(subscribeTheme, () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"), () => null);

/**
 * Lleva el vídeo a la etapa: hacia delante lo reproduce hasta el segundo de la etapa;
 * hacia atrás (se ha vaciado un campo), al abrir una solicitud o con movimiento
 * reducido, salta directamente. Un formulario que se abre ya completo también enseña la salida.
 */
function useStageVideo(stage: number, jump: boolean, reduced: boolean, theme: Theme | null) {
  const video = useRef<HTMLVideoElement>(null);
  const first = useRef(true);
  const shownTheme = useRef(theme);

  useEffect(() => {
    const v = video.current;
    if (!v || !theme) return;
    // Al cambiar de tema el vídeo se recarga: se coloca sin reproducir.
    if (shownTheme.current !== theme) {
      shownTheme.current = theme;
      first.current = true;
    }
    const index = Math.max(0, Math.min(SENT, Math.round(stage)));
    let frame = 0;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      const end = Number.isFinite(v.duration) ? v.duration - 0.04 : 9.92;
      const opening = jump || first.current;
      const leaving = index === ALL_BLOCKS_DONE && opening && !reduced;
      const target =
        index < ALL_BLOCKS_DONE ? VIDEOS[theme].stops[index] : opening && (index === SENT || reduced) ? FINISHED_STILL : end;
      const seek = () => {
        v.pause();
        v.currentTime = Math.min(target, end);
      };

      if (leaving) v.currentTime = FINISHED_STILL;
      if (reduced || (opening && !leaving) || target < v.currentTime - 0.05) {
        seek();
      } else if (target > v.currentTime + 0.05) {
        const tick = () => {
          if (cancelled) return;
          if (v.currentTime >= target - 0.03 || v.ended) seek();
          else frame = requestAnimationFrame(tick);
        };
        v.play().then(() => {
          frame = requestAnimationFrame(tick);
        }, seek);
      }
      first.current = false;
    };

    // currentTime solo se puede fijar con los metadatos cargados.
    if (v.readyState >= 1) run();
    else v.addEventListener("loadedmetadata", run, { once: true });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      v.removeEventListener("loadedmetadata", run);
    };
  }, [stage, jump, reduced, theme]);

  return video;
}

export function PackageStage({
  stage,
  variant,
  jump = false,
  className,
}: {
  stage: number;
  variant: PackageVariant;
  /** Abrir una solicitud guardada: salto directo, sin reproducir. */
  jump?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const theme = useTheme();
  const video = useStageVideo(stage, jump, reduced, theme);
  const [gone, setGone] = useState(false);
  const done = stage >= ALL_BLOCKS_DONE;

  return (
    <div className={cn("grid gap-4", className)}>
      {/* 4:3 recorta solo los lados: la caja gana tamaño. Limitado para caber en pantallas bajas. */}
      <div className="relative mx-auto aspect-[4/3] w-[min(100%,calc((100dvh-16rem)*4/3))] overflow-hidden bg-bg">
        {/* Blanquea donde hay mucho azul: el fondo gris sí, el cartón y las pegatinas no. */}
        <svg aria-hidden className="absolute size-0">
          <filter id={WHITE_BACKGROUND_FILTER} colorInterpolationFilters="sRGB" x="0" y="0" width="100%" height="100%">
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 1 0 0" result="white" />
            <feComponentTransfer in="white" result="background">
              <feFuncA type="table" tableValues="0 0 0 0 0 0 0 0 1 1 1" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="background" />
            </feMerge>
          </filter>
        </svg>
        <video
          ref={video}
          src={theme ? VIDEOS[theme].src : undefined}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          onTimeUpdate={(event) => setGone(Boolean(theme) && event.currentTarget.currentTime >= VIDEOS[theme ?? "light"].goneAt)}
          className={cn("absolute inset-0 h-full w-full object-cover", BLEND)}
        />
        {variant.boxCount > 1 && stage >= 2 && !gone ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 font-mono text-xs text-bg">×{variant.boxCount}</span>
        ) : null}
        <span
          className={cn(
            "absolute inline-flex items-center gap-1.5 rounded-full bg-success font-medium whitespace-nowrap text-success-ink transition-opacity duration-500",
            gone ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 text-base" : "top-3 right-3 px-3 py-1 text-xs",
            done ? "opacity-100" : "opacity-0",
          )}
          aria-hidden={!done}
        >
          <Check className="size-3.5" strokeWidth={3} /> {stage >= SENT ? "Paquete enviado" : "Paquete listo: ya puedes enviarlo"}
        </span>
      </div>

      {/* Barra de progreso con 4 hitos: uno por bloque del formulario */}
      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas del paquete">
        {STAGE_LABELS.slice(1, SENT).map((label, i) => {
          const reached = stage >= i + 1;
          return (
            <li key={label} className="grid gap-1.5">
              <span className={cn("h-1 rounded-full transition-colors duration-500", reached ? "bg-accent" : "bg-line")} />
              <span className={cn("text-[10px] sm:text-xs", reached ? "text-ink" : "text-muted")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {`Paquete: ${STAGE_LABELS[Math.max(0, Math.min(SENT, stage))]}`}
      </p>
    </div>
  );
}
