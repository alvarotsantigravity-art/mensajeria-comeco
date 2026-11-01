"use client";

import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

// Texturas procedurales (sin descargar imágenes): cartón kraft, papel y cinta.
// Se generan una vez por sesión y se comparten entre todas las piezas.

type Rng = () => number;
function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!] as const;
}

function toTexture(c: HTMLCanvasElement, color: boolean): Texture {
  const tex = new CanvasTexture(c);
  if (color) tex.colorSpace = SRGBColorSpace;
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/** Fibras, manchas y ondulado del cartón: se dibuja igual en color y en relieve. */
function paintCardboard(ctx: CanvasRenderingContext2D, size: number, mode: "color" | "bump", inner: boolean) {
  const rand = mulberry32(inner ? 7 : 42);
  const base = mode === "bump" ? "#808080" : inner ? "#d6ad7c" : "#c18d57";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Manchas suaves de tono (el kraft nunca es uniforme).
  for (let i = 0; i < 140; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 30 + rand() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const light = rand() > 0.5;
    const a = mode === "bump" ? 0.05 : 0.07;
    g.addColorStop(0, light ? `rgba(255,236,205,${a})` : `rgba(90,52,20,${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Ondulado interior que se marca a través de la cara (canales paralelos).
  const flute = size / 48;
  for (let y = 0; y < size; y += flute) {
    ctx.fillStyle = mode === "bump" ? "rgba(255,255,255,0.10)" : "rgba(255,240,215,0.035)";
    ctx.fillRect(0, y, size, flute * 0.45);
    ctx.fillStyle = mode === "bump" ? "rgba(0,0,0,0.08)" : "rgba(80,45,15,0.03)";
    ctx.fillRect(0, y + flute * 0.5, size, flute * 0.3);
  }

  // Fibras: miles de trazos cortos con ligera orientación.
  for (let i = 0; i < 9000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 2 + rand() * 9;
    const ang = (rand() - 0.5) * 1.2;
    const dark = rand() > 0.55;
    ctx.strokeStyle =
      mode === "bump"
        ? dark
          ? "rgba(0,0,0,0.18)"
          : "rgba(255,255,255,0.18)"
        : dark
          ? `rgba(70,38,12,${0.08 + rand() * 0.12})`
          : `rgba(255,232,195,${0.06 + rand() * 0.1})`;
    ctx.lineWidth = 0.6 + rand() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  // Motas oscuras (impurezas del papel reciclado).
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = mode === "bump" ? "rgba(0,0,0,0.25)" : `rgba(55,30,10,${0.15 + rand() * 0.25})`;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, 0.4 + rand() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type CardboardTextures = { map: Texture; bumpMap: Texture; innerMap: Texture };

let cardboard: CardboardTextures | null = null;
export function getCardboardTextures(): CardboardTextures {
  if (cardboard) return cardboard;
  const size = 1024;
  const [c1, x1] = canvas(size);
  paintCardboard(x1, size, "color", false);
  const [c2, x2] = canvas(size);
  paintCardboard(x2, size, "bump", false);
  const [c3, x3] = canvas(size);
  paintCardboard(x3, size, "color", true);
  cardboard = { map: toTexture(c1, true), bumpMap: toTexture(c2, false), innerMap: toTexture(c3, true) };
  return cardboard;
}

/** Ruido de papel para la etiqueta (se mezcla sobre el dibujo de la etiqueta). */
export function paintPaperGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rand = mulberry32(11);
  for (let i = 0; i < (w * h) / 60; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
}

/** Cinta de embalar: brillo con micro-arrugas longitudinales. */
let tapeBump: Texture | null = null;
export function getTapeBump(): Texture {
  if (tapeBump) return tapeBump;
  const [c, ctx] = canvas(256);
  const rand = mulberry32(3);
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const y = rand() * 256;
    ctx.strokeStyle = rand() > 0.5 ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.5 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(85, y + (rand() - 0.5) * 6, 170, y + (rand() - 0.5) * 6, 256, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }
  tapeBump = toTexture(c, false);
  return tapeBump;
}
