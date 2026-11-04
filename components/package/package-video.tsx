"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// La caja del formulario es el vídeo de docs/ANIMACION (public/caja/caja.mp4): cada
// bloque completo hace avanzar el vídeo hasta la fase siguiente y se para ahí.

export type PackageVariant = { boxCount: number };

export const STAGE_LABELS = ["Inicio", "Montaje", "Etiqueta", "Precinto", "Pegatinas", "Enviado"] as const;

const SRC = "/caja/caja.mp4";
const POSTER = "/caja/poster.webp";

/**
 * Segundo del vídeo en el que se para cada etapa. Las dos primeras, con la caja
 * abierta (el solicitante sale ya relleno del perfil); luego cerrada con la etiqueta,
 * precintada, girada con pegatinas y funda, y fuera de escena.
 */
const STAGE_TIMES = [0, 1.3, 3.6, 5.8, 8.0, 10.1];
/** Una solicitud enviada que se vuelve a abrir: la caja lista, no la mesa vacía. */
const SENT_STILL = 8.6;

/** Bordes fundidos con el fondo de la app (sin tarjeta). */
const FADE = "[mask-image:radial-gradient(ellipse_50%_50%_at_50%_55%,black_30%,rgb(0_0_0/0.6)_55%,transparent_100%)]";

const reducedQuery = "(prefers-reduced-motion: reduce)";
function subscribeReduced(callback: () => void) {
  const mq = window.matchMedia(reducedQuery);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
const useReducedMotion = () => useSyncExternalStore(subscribeReduced, () => window.matchMedia(reducedQuery).matches, () => true);

/**
 * Lleva el vídeo a la etapa: hacia delante lo reproduce hasta el segundo de la etapa;
 * hacia atrás (se ha vaciado un campo), al abrir una solicitud o con movimiento
 * reducido, salta directamente.
 */
function useStageVideo(stage: number, jump: boolean, reduced: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const index = Math.max(0, Math.min(5, Math.round(stage)));
    let frame = 0;
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      const end = Number.isFinite(v.duration) ? v.duration - 0.04 : STAGE_TIMES[5];
      const target = index === 5 ? (jump || first.current ? SENT_STILL : end) : STAGE_TIMES[index];
      const seek = () => {
        v.pause();
        v.currentTime = Math.min(target, end);
      };

      if (reduced || jump || first.current || target < v.currentTime - 0.05) {
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
  }, [stage, jump, reduced]);

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
  const video = useStageVideo(stage, jump, reduced);

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="relative aspect-video">
        <video
          ref={video}
          src={SRC}
          poster={POSTER}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
          className={cn("absolute inset-0 h-full w-full object-cover", FADE)}
        />
        {variant.boxCount > 1 && stage >= 2 ? (
          <span className="absolute top-3 left-3 rounded-full bg-ink px-2.5 py-1 font-mono text-xs text-bg">×{variant.boxCount}</span>
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
