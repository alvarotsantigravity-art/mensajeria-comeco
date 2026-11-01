"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, PerformanceMonitor } from "@react-three/drei";
import { PMREMGenerator, type Group, type Scene, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import gsap from "gsap";
import { GlobeSticker, ShippingLabel, StackedBoxes, UrgentStamp, Contents } from "./details";
import { PackageBox, Tape } from "./box";
import { Vehicle } from "./vehicle";
import { usePackageTimeline } from "./use-package-timeline";
import {
  BOX,
  COLORS,
  createSceneParams,
  lerp,
  ParamsContext,
  useSceneParams,
  type PackageVariant,
  type ScenePart,
  type SceneParams,
} from "./scene-params";

export type PackageSceneProps = {
  stage: number;
  variant: PackageVariant;
  /** Salto corto (abrir una solicitud guardada) en lugar de la animación completa. */
  jump?: boolean;
  onPart?: (part: ScenePart) => void;
  onLabelHover?: (hovered: boolean) => void;
};

const ORBIT_LIMIT = (25 * Math.PI) / 180;

/** Escena 3D del paquete. Se carga con next/dynamic (ssr: false). */
export default function PackageScene(props: PackageSceneProps) {
  const [params] = useState(createSceneParams);
  const [lowQuality, setLowQuality] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  // Animación continua solo en reposo (respiración de la etapa 0).
  const idle = props.stage === 0;

  return (
    <div
      ref={wrapper}
      className="absolute inset-0 touch-pan-y select-none"
      aria-hidden
    >
      <ParamsContext.Provider value={params}>
        <Canvas
          frameloop={idle ? "always" : "demand"}
          dpr={[1, 2]}
          shadows={!lowQuality}
          camera={{ position: [2.2, 3.1, 4.4], fov: 30, near: 0.1, far: 50 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        >
          <PerformanceMonitor onDecline={() => setLowQuality(true)} />
          <SceneContent {...props} lowQuality={lowQuality} />
          <OrbitDrag target={wrapper} params={params} />
        </Canvas>
      </ParamsContext.Provider>
    </div>
  );
}

function SceneContent({ stage, variant, jump, onPart, onLabelHover, lowQuality }: PackageSceneProps & { lowQuality: boolean }) {
  const p = useSceneParams();
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const root = useRef<Group>(null);
  const burst = useRef<Group>(null);

  usePackageTimeline(p, stage, { invalidate, jump });

  // Variantes: transición corta propia (no dependen de la etapa).
  useEffect(() => {
    gsap.to(p, {
      urgentK: variant.urgent ? 1 : 0,
      intlK: variant.international ? 1 : 0,
      stackK: variant.shipmentType === "caja" && variant.boxCount > 1 ? 1 : 0,
      duration: 0.4,
      ease: "power2.out",
      onUpdate: invalidate,
    });
  }, [p, variant.urgent, variant.international, variant.shipmentType, variant.boxCount, invalidate]);

  useEffect(() => {
    camera.lookAt(0.55, 0.38, 0);
    invalidate();
  }, [camera, invalidate]);

  useFrame(({ clock }) => {
    const g = root.current!;
    // Respiración en reposo (se apaga al montar la caja).
    const breathe = 1 - p.fold;
    g.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.05 * breathe + 0.05 * breathe;
    g.rotation.y = p.orbitY + Math.sin(clock.elapsedTime * 0.5) * 0.12 * breathe;
    g.rotation.x = p.orbitX;

    // Squash & stretch al precintar.
    const s = Math.sin(Math.PI * p.squash);
    g.scale.set(1 + s * 0.06, 1 - s * 0.1, 1 + s * 0.06);

    // Partículas: anillo que se expande y desaparece.
    const d = p.done;
    burst.current!.visible = d > 0 && d < 1;
    burst.current!.children.forEach((child, i) => {
      const a = (i / burst.current!.children.length) * Math.PI * 2;
      const r = lerp(0.6, 1.5, d);
      child.position.set(Math.cos(a) * r, BOX.h + 0.25 + Math.sin(d * Math.PI) * 0.5, Math.sin(a) * r);
      child.scale.setScalar(Math.max(0.001, Math.sin(d * Math.PI)) * 0.06);
    });
  });

  return (
    <>
      <ambientLight intensity={0.22} />
      <hemisphereLight args={["#fff7ec", "#b8ab98", 0.3]} />
      <directionalLight
        position={[4, 7, 4]}
        intensity={1.6}
        color="#fff3e2"
        castShadow={!lowQuality}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-bias={-0.0005}
      />
      <StudioEnvironment />

      <group ref={root}>
        <PackageBox
          onPart={onPart}
          front={
            <>
              <ShippingLabel
                company={variant.labelCompany}
                postalCode={variant.labelPostalCode}
                city={variant.labelCity}
                reference={variant.labelRef}
                onPart={onPart}
                onHover={onLabelHover}
              />
              <UrgentStamp onPart={onPart} />
            </>
          }
          right={<GlobeSticker />}
        />
        <Contents type={variant.shipmentType} />
        <Tape />
        <group ref={burst}>
          {Array.from({ length: 12 }, (_, i) => (
            <mesh key={i}>
              <octahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={i % 3 === 0 ? COLORS.accent : COLORS.tape} roughness={0.5} />
            </mesh>
          ))}
        </group>
      </group>

      <StackedBoxes count={variant.shipmentType === "caja" ? variant.boxCount : 1} />
      <Vehicle transport={variant.transport} onPart={onPart} />

      {!lowQuality ? (
        <ContactShadows position={[0, 0.001, 0]} opacity={0.38} scale={12} blur={2.6} far={2.5} resolution={512} color="#5b4630" />
      ) : null}
    </>
  );
}

/** Luz de estudio generada en local (RoomEnvironment): sin descargar HDRIs de CDNs. */
function applyStudioEnvironment(gl: WebGLRenderer, scene: Scene) {
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.35;
  return () => {
    scene.environment = null;
    env.dispose();
    room.dispose();
    pmrem.dispose();
  };
}

function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => applyStudioEnvironment(gl, scene), [gl, scene]);
  return null;
}

/** Arrastrar para girar un poco (±25°); al soltar vuelve suavemente. */
function OrbitDrag({ target, params }: { target: React.RefObject<HTMLDivElement | null>; params: SceneParams }) {
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const toY = gsap.quickTo(params, "orbitY", { duration: 0.5, ease: "power3.out", onUpdate: invalidate });
    const toX = gsap.quickTo(params, "orbitX", { duration: 0.5, ease: "power3.out", onUpdate: invalidate });
    let start: { x: number; y: number } | null = null;
    const clampAngle = (v: number) => Math.max(-ORBIT_LIMIT, Math.min(ORBIT_LIMIT, v));

    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      toY(clampAngle((e.clientX - start.x) * 0.006));
      toX(clampAngle((e.clientY - start.y) * 0.003) * 0.4);
    };
    const up = () => {
      if (!start) return;
      start = null;
      gsap.to(params, { orbitY: 0, orbitX: 0, duration: 1.2, ease: "elastic.out(1, 0.6)", onUpdate: invalidate });
    };

    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [target, params, invalidate]);

  return null;
}

