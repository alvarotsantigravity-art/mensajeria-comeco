"use client";

import { useEffect, useState } from "react";
import { BLOCK_ORDER, blockSchemas, type BlockKey, type RequestFormValues } from "@/lib/requests/schema";

export type ShipmentProgress = {
  /** Bloques 01–04 completos. */
  blocks: Record<BlockKey, boolean>;
  /** 0–4: bloques consecutivos completos (la escena 3D avanza en orden). Fase 5 = precintado. */
  stage: number;
  percent: number;
};

export function computeProgress(values: RequestFormValues): ShipmentProgress {
  const blocks = Object.fromEntries(
    BLOCK_ORDER.map((key) => [key, blockSchemas[key].safeParse(values).success]),
  ) as Record<BlockKey, boolean>;
  const firstIncomplete = BLOCK_ORDER.findIndex((key) => !blocks[key]);
  const done = BLOCK_ORDER.filter((key) => blocks[key]).length;
  return {
    blocks,
    stage: firstIncomplete === -1 ? BLOCK_ORDER.length : firstIncomplete,
    percent: Math.round((done / BLOCK_ORDER.length) * 100),
  };
}

/** Progreso del formulario con debounce (150 ms) para no validar en cada tecla. */
export function useShipmentProgress(values: RequestFormValues, delay = 150): ShipmentProgress {
  const [progress, setProgress] = useState(() => computeProgress(values));

  useEffect(() => {
    const timer = setTimeout(() => setProgress(computeProgress(values)), delay);
    return () => clearTimeout(timer);
  }, [values, delay]);

  return progress;
}
