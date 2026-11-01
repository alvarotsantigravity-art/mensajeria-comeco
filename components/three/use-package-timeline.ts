"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { SceneParams } from "./scene-params";

/**
 * Timeline maestra (§6.4): una sola timeline pausada con una etiqueta por etapa
 * (s0…s5). Avanzar o retroceder es `tweenTo(etiqueta)`, así nunca queda un
 * estado incoherente: cualquier punto de la timeline es una escena válida.
 */
export function usePackageTimeline(
  params: SceneParams,
  stage: number,
  { invalidate, jump = false }: { invalidate: () => void; jump?: boolean },
) {
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const tween = useRef<gsap.core.Tween | null>(null);
  const first = useRef(true);

  useLayoutEffect(() => {
    const tl = gsap.timeline({ paused: true, onUpdate: invalidate });
    tl.addLabel("s0")
      .to(params, { fold: 1, duration: 1.1, ease: "power2.inOut" })
      .addLabel("s1")
      .to(params, { contents: 1, duration: 1.1, ease: "none" })
      .addLabel("s2")
      .to(params, { label: 1, duration: 0.9, ease: "power2.out" })
      .addLabel("s3")
      .to(params, { service: 1, duration: 1, ease: "none" })
      .addLabel("s4")
      .to(params, { close: 1, duration: 1, ease: "power2.inOut" })
      .to(params, { tape: 1, duration: 0.9, ease: "power1.inOut" })
      .to(params, { squash: 1, duration: 0.45, ease: "none" })
      .to(params, { done: 1, duration: 0.5, ease: "power2.out" }, "<0.1")
      .addLabel("s5");
    timeline.current = tl;
    return () => {
      tween.current?.kill();
      tl.kill();
    };
  }, [params, invalidate]);

  useEffect(() => {
    const tl = timeline.current;
    if (!tl) return;
    const label = `s${Math.max(0, Math.min(5, Math.round(stage)))}`;
    tween.current?.kill();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      tl.seek(label);
      invalidate();
    } else if (first.current || jump) {
      // Solicitud ya existente: salto corto, sin reproducir toda la secuencia.
      const distance = Math.abs(tl.labels[label] - tl.time());
      tween.current = distance > 0 ? tl.tweenTo(label, { duration: Math.min(0.7, distance), ease: "power2.inOut" }) : null;
    } else {
      tween.current = tl.tweenTo(label);
    }
    first.current = false;
  }, [stage, jump, invalidate]);
}
