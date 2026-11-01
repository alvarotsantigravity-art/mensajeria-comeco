import { createContext, useContext } from "react";

/**
 * Estado animable de la escena (§6.4). La timeline de GSAP escribe aquí y cada
 * pieza lo lee en useFrame. Todo va de 0 a 1 para que sea reversible.
 */
export type SceneParams = {
  /** 0 cartón plano · 1 caja montada con las solapas abiertas (etapa 1). */
  fold: number;
  /** Contenido entrando (etapa 2). */
  contents: number;
  /** Etiqueta despegándose y pegándose (etapa 3). */
  label: number;
  /** Sello, pegatina y vehículo (etapa 4). */
  service: number;
  /** Solapas cerrándose (etapa 5). */
  close: number;
  /** Precinto recorriendo la caja (etapa 5). */
  tape: number;
  /** Squash & stretch al terminar (etapa 5). */
  squash: number;
  /** Partículas y check final. */
  done: number;
  // Variantes: se interpolan aparte para que un cambio no salte de golpe.
  urgentK: number;
  intlK: number;
  stackK: number;
  /** Rotación de arrastre del usuario (radianes, limitada a ±25°). */
  orbitY: number;
  orbitX: number;
};

export const createSceneParams = (): SceneParams => ({
  fold: 0,
  contents: 0,
  label: 0,
  service: 0,
  close: 0,
  tape: 0,
  squash: 0,
  done: 0,
  urgentK: 0,
  intlK: 0,
  stackK: 0,
  orbitY: 0,
  orbitX: 0,
});

export type PackageVariant = {
  shipmentType: "documentacion" | "caja" | null;
  boxCount: number;
  urgent: boolean;
  international: boolean;
  labelCompany: string;
  labelCity: string;
  labelPostalCode: string;
  labelRef: string;
};

/** Bloques del formulario a los que lleva un clic en cada parte de la caja. */
export type ScenePart = "requester" | "petition" | "destination" | "service";

export const STAGE_LABELS = ["Inicio", "Montaje", "Embalaje", "Etiqueta", "Servicio", "Precintado"] as const;

export const ParamsContext = createContext<SceneParams | null>(null);

export function useSceneParams(): SceneParams {
  const params = useContext(ParamsContext);
  if (!params) throw new Error("useSceneParams fuera de PackageScene");
  return params;
}

/** Medidas de la caja (unidades de escena ≈ metros a escala). */
export const BOX = { w: 1.4, h: 0.95, d: 1, t: 0.025 } as const;

export const COLORS = {
  kraft: "#c8996a",
  kraftDark: "#b5834f",
  kraftInner: "#d9b48a",
  tape: "#b8895a",
  urgent: "#ff4d2e",
  accent: "#2f4bff",
  paper: "#f4f1ea",
  ink: "#0b0b0f",
  clay: "#e9e6df",
  tire: "#2a2a30",
} as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Sub-rango [a, b] de un parámetro 0–1, reescalado a 0–1. */
export const segment = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
