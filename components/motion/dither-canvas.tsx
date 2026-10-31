"use client";

import { useEffect, useRef } from "react";

// 4x4 Bayer matrix, normalised to 0..1 thresholds.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/**
 * Blue ordered-dither gradient that drifts slowly (2D canvas, no WebGL).
 * The Three.js version with the 3D box arrives in Fase 4.
 */
export function DitherCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const cell = 4; // px per dither dot
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let raf = 0;
    let w = 0;
    let h = 0;
    let image: ImageData;

    const resize = () => {
      w = Math.max(1, Math.ceil(canvas.clientWidth / cell));
      h = Math.max(1, Math.ceil(canvas.clientHeight / cell));
      canvas.width = w;
      canvas.height = h;
      image = ctx.createImageData(w, h);
    };

    const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
    const [ar, ag, ab] = hexToRgb(accent || "#2f4bff");

    const draw = () => {
      const t = frame / 240;
      const data = image.data;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const nx = x / w;
          const ny = y / h;
          // Soft moving light blob in the lower right.
          const dx = nx - (0.72 + Math.sin(t) * 0.08);
          const dy = ny - (0.78 + Math.cos(t * 0.8) * 0.06);
          const intensity = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 1.35) ** 1.4;
          const on = intensity > BAYER[(y % 4) * 4 + (x % 4)];
          const i = (y * w + x) * 4;
          data[i] = ar;
          data[i + 1] = ag;
          data[i + 2] = ab;
          data[i + 3] = on ? 255 : 0;
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const loop = () => {
      frame++;
      if (frame % 2 === 0) draw(); // ~30 fps is plenty for a slow drift
      raf = requestAnimationFrame(loop);
    };

    resize();
    draw();
    if (!reduceMotion) raf = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => {
      resize();
      draw();
    });
    observer.observe(canvas);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduceMotion) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{ imageRendering: "pixelated", width: "100%", height: "100%" }}
    />
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return [47, 75, 255];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}
