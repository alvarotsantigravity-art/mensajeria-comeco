"use client";

import { useEffect, useState } from "react";
import { BLOCK_ORDER, blockSchemas, type BlockKey, type RequestFormValues, type RequestSchemas } from "@/lib/requests/schema";

export type ShipmentProgress = {
  /** Bloques 01–04 completos. */
  blocks: Record<BlockKey, boolean>;
  /** 0–4: bloques consecutivos completos (la escena 3D avanza en orden). Fase 5 = precintado. */
  stage: number;
  percent: number;
};

export function computeProgress(values: RequestFormValues, blocks: RequestSchemas["blocks"] = blockSchemas): ShipmentProgress {
  const complete = Object.fromEntries(
    BLOCK_ORDER.map((key) => [key, blocks[key].safeParse(values).success]),
  ) as Record<BlockKey, boolean>;
  const firstIncomplete = BLOCK_ORDER.findIndex((key) => !complete[key]);
  const done = BLOCK_ORDER.filter((key) => complete[key]).length;
  return {
    blocks: complete,
    stage: firstIncomplete === -1 ? BLOCK_ORDER.length : firstIncomplete,
    percent: Math.round((done / BLOCK_ORDER.length) * 100),
  };
}

/** Progreso del formulario con debounce (150 ms) para no validar en cada tecla. */
export function useShipmentProgress(values: RequestFormValues, blocks: RequestSchemas["blocks"] = blockSchemas, delay = 150): ShipmentProgress {
  const [progress, setProgress] = useState(() => computeProgress(values, blocks));

  useEffect(() => {
    const timer = setTimeout(() => setProgress(computeProgress(values, blocks)), delay);
    return () => clearTimeout(timer);
  }, [values, blocks, delay]);

  return progress;
}
