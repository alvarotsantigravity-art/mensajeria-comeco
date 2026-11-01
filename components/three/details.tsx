"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { CanvasTexture, IcosahedronGeometry, SRGBColorSpace, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";
import { kraftMaterial, TapeMaterial } from "./box";
import { BOX, COLORS, lerp, segment, useSceneParams, type ScenePart } from "./scene-params";
import { paintPaperGrain } from "./textures";

/** Caja con cantos redondeados y el material que se le pase como hijo. */
function Rounded({
  size,
  radius = 0.02,
  children,
  ...props
}: { size: [number, number, number]; radius?: number; children?: React.ReactNode } & Omit<React.ComponentProps<"mesh">, "children">) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 3, radius), [w, h, d, radius]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow {...props}>
      {children}
    </mesh>
  );
}

/** Bola de papel de embalar arrugado: icosaedro con desplazamiento pseudoaleatorio. */
function crumpledGeometry(radius: number, seed: number) {
  const geo = new IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = Math.sin(x * 37 + seed) * Math.cos(y * 41 + seed * 1.3) * Math.sin(z * 29 + seed * 0.7);
    const k = 1 + n * 0.28;
    pos.setXYZ(i, x * k, y * k * 0.85, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

const { w: W, h: H, d: D, t: T } = BOX;
const bounce = gsap.parseEase("bounce.out");
const backOut = gsap.parseEase("back.out(2)");

/** Fuente de la app (next/font genera un nombre de familia propio). */
function appFont() {
  if (typeof document === "undefined") return "sans-serif";
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

function redraw(texture: CanvasTexture, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = texture.image as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx);
  texture.needsUpdate = true;
}

/** CanvasTexture que se redibuja cuando cambian `deps`. */
function useCanvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, deps: unknown[]) {
  const invalidate = useThree((s) => s.invalidate);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [width, height]);

  useEffect(() => {
    redraw(texture, draw);
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture, invalidate, ...deps]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: number, font: string) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${font}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 18);
  return text;
}

// ---------------------------------------------------------------------------
// Etiqueta con los datos reales del formulario (etapa 3)
// ---------------------------------------------------------------------------
export function ShippingLabel({
  company,
  postalCode,
  city,
  reference,
  onPart,
  onHover,
}: {
  company: string;
  postalCode: string;
  city: string;
  reference: string;
  onPart?: (part: ScenePart) => void;
  onHover?: (hovered: boolean) => void;
}) {
  const p = useSceneParams();
  const group = useRef<Group>(null);
  const texture = useCanvasTexture(
    640,
    400,
    (ctx) => {
      const font = appFont();
      ctx.fillStyle = COLORS.paper;
      ctx.fillRect(0, 0, 640, 400);
      ctx.strokeStyle = COLORS.ink;
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 612, 372);

      ctx.fillStyle = "#6b6b72";
      ctx.font = `600 22px ${font}`;
      ctx.fillText("DESTINATARIO", 40, 62);

      ctx.fillStyle = COLORS.ink;
      const name = company.trim() || "Empresa de destino";
      fitText(ctx, name, 560, 64, 700, font);
      ctx.globalAlpha = company.trim() ? 1 : 0.3;
      ctx.fillText(name, 40, 140);

      const place = [postalCode.trim(), city.trim()].filter(Boolean).join("  ") || "CP  Ciudad";
      ctx.globalAlpha = postalCode.trim() || city.trim() ? 1 : 0.3;
      fitText(ctx, place, 560, 48, 500, font);
      ctx.fillText(place, 40, 210);
      ctx.globalAlpha = 1;

      // Código de barras decorativo + referencia
      ctx.fillStyle = COLORS.ink;
      let x = 40;
      const seed = (reference || "MSJ").split("").reduce((a, c) => a + c.charCodeAt(0), 7);
      for (let i = 0; i < 46; i++) {
        const bar = ((seed * (i + 3)) % 5) + 2;
        ctx.fillRect(x, 262, bar, 70);
        x += bar + 4;
      }
      ctx.font = `500 26px ui-monospace, monospace`;
      ctx.fillText(reference || "MSJ-0000-0000", 40, 362);
      paintPaperGrain(ctx, 640, 400);
    },
    [company, postalCode, city, reference],
  );

  useFrame(() => {
    const t = p.label;
    const k = backOut(t);
    // Llega flotando desde arriba a la derecha, girada, y se pega en la pared frontal.
    group.current!.visible = t > 0.001;
    group.current!.position.set(lerp(0.9, -0.2, k), lerp(H + 1.1, 0.5, t), lerp(1, 0.004, k));
    group.current!.rotation.set(lerp(-0.5, 0, t), lerp(0.7, 0, k), lerp(0.35, 0, k));
  });

  return (
    <group
      ref={group}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onPart?.("destination");
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        onHover?.(false);
        document.body.style.cursor = "";
      }}
    >
      <mesh>
        <planeGeometry args={[0.72, 0.45]} />
        <meshStandardMaterial map={texture} roughness={0.85} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Sello "URGENTE" (etapa 4) — se estampa: grande y transparente → tamaño final.
// ---------------------------------------------------------------------------
export function UrgentStamp({ onPart }: { onPart?: (part: ScenePart) => void }) {
  const p = useSceneParams();
  const mesh = useRef<Mesh>(null);
  const texture = useCanvasTexture(
    320,
    140,
    (ctx) => {
      ctx.strokeStyle = COLORS.urgent;
      ctx.fillStyle = COLORS.urgent;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(10, 10, 300, 120, 18);
      ctx.stroke();
      ctx.font = `800 70px ${appFont()}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("URGENTE", 160, 74);
    },
    [],
  );

  useFrame(() => {
    const k = Math.min(p.service * 1.6, 1) * p.urgentK;
    mesh.current!.visible = k > 0.001;
    mesh.current!.scale.setScalar(lerp(2.4, 1, k));
    (mesh.current!.material as MeshStandardMaterial).opacity = Math.min(1, k * 1.4);
  });

  return (
    <mesh
      ref={mesh}
      position={[0.42, 0.78, 0.006]}
      rotation={[0, 0, 0.18]}
      onClick={(e) => {
        e.stopPropagation();
        onPart?.("service");
      }}
    >
      <planeGeometry args={[0.42, 0.18]} />
      <meshStandardMaterial map={texture} transparent roughness={0.8} depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Pegatina de envío internacional (globo) en la pared derecha.
// ---------------------------------------------------------------------------
export function GlobeSticker() {
  const p = useSceneParams();
  const mesh = useRef<Mesh>(null);
  const texture = useCanvasTexture(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = COLORS.accent;
      ctx.beginPath();
      ctx.arc(128, 128, 120, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(128, 128, 78, 0, Math.PI * 2);
      ctx.moveTo(50, 128);
      ctx.lineTo(206, 128);
      ctx.moveTo(128, 50);
      ctx.lineTo(128, 206);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(128, 128, 36, 78, 0, 0, Math.PI * 2);
      ctx.stroke();
    },
    [],
  );

  useFrame(() => {
    const k = backOut(segment(p.service, 0.2, 1)) * p.intlK;
    mesh.current!.visible = k > 0.001;
    mesh.current!.scale.setScalar(Math.max(k, 0.001));
  });

  return (
    <mesh ref={mesh} position={[0.004, 0.62, 0.15]} rotation={[0, Math.PI / 2, 0]}>
      <circleGeometry args={[0.16, 40]} />
      <meshStandardMaterial map={texture} transparent roughness={0.6} polygonOffset polygonOffsetFactor={-2} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Contenido (etapa 2): sobre de documentación o objetos + relleno con rebote.
// ---------------------------------------------------------------------------
export function Contents({ type }: { type: "documentacion" | "caja" | null }) {
  const p = useSceneParams();
  const envelope = useRef<Group>(null);
  const items = useRef<Group>(null);

  useFrame(() => {
    const t = p.contents;
    const showEnvelope = type === "documentacion";
    envelope.current!.visible = showEnvelope && t > 0.001;
    items.current!.visible = type === "caja" && t > 0.001;

    if (showEnvelope) {
      // Entra planeando: arco desde la izquierda con balanceo.
      const k = gsap.parseEase("power2.out")(t);
      // Acaba apoyado en la pared trasera, asomando por encima del borde.
      envelope.current!.position.set(lerp(-2.2, 0.05, k), lerp(2.2, 0.44, k) + Math.sin(k * Math.PI) * 0.35, lerp(0.8, -0.3, k));
      envelope.current!.rotation.set(lerp(-1.2, -0.22, k), lerp(0.6, 0.08, k), Math.sin(k * Math.PI * 3) * 0.25 * (1 - k));
    } else {
      items.current!.children.forEach((child, i) => {
        // Escalonado dentro de [0, 1]: todas terminan en su sitio al acabar la etapa.
        const start = Math.min(i * 0.05, 0.5);
        const local = segment(t, start, start + 0.5);
        const target = child.userData.y as number;
        child.position.y = lerp(target + 2.4, target, bounce(local));
        child.visible = local > 0;
      });
    }
  });

  const filler = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        x: Math.cos(i * 1.7) * 0.45,
        z: Math.sin(i * 2.3) * 0.3,
        geometry: crumpledGeometry(0.1 + (i % 3) * 0.03, i * 3.1),
      })),
    [],
  );

  return (
    <group>
      <group ref={envelope}>
        <Rounded size={[0.95, 0.65, 0.02]} radius={0.008}>
          <meshPhysicalMaterial color="#e6cf9f" roughness={0.8} sheen={0.4} sheenColor="#fff3dc" />
        </Rounded>
        {/* Solapa del sobre */}
        <mesh position={[0, 0.16, 0.014]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.46, 0.46]} />
          <meshPhysicalMaterial color="#dcc292" roughness={0.85} sheen={0.3} />
        </mesh>
      </group>

      <group ref={items}>
        <Rounded userData={{ y: 0.22 }} position={[-0.3, 0.22, -0.12]} size={[0.42, 0.38, 0.5]} radius={0.015}>
          <meshPhysicalMaterial color="#f3f1ec" roughness={0.45} clearcoat={0.4} clearcoatRoughness={0.4} />
        </Rounded>
        <group userData={{ y: 0.42 }} position={[0.3, 0.42, -0.22]} rotation={[0.25, 0.4, 0.3]}>
          <mesh material={kraftMaterial()} castShadow receiveShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.78, 40]} />
          </mesh>
          {[0.4, -0.4].map((y) => (
            <mesh key={y} position={[0, y, 0]} castShadow>
              <cylinderGeometry args={[0.108, 0.108, 0.05, 40]} />
              <meshPhysicalMaterial color="#f1f1ef" roughness={0.35} clearcoat={0.6} />
            </mesh>
          ))}
        </group>
        <Rounded userData={{ y: 0.28 }} position={[0.05, 0.28, 0.22]} size={[0.36, 0.2, 0.28]} radius={0.012}>
          <meshPhysicalMaterial color="#2f4bff" roughness={0.4} clearcoat={0.5} clearcoatRoughness={0.3} />
        </Rounded>
        {filler.map((f, i) => (
          <mesh key={i} userData={{ y: 0.72 }} position={[f.x, 0.72, f.z]} rotation={[i, i * 2, 0]} geometry={f.geometry} material={kraftMaterial(true)} castShadow />
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cajas apiladas detrás si hay N > 1 (máx. 5 visibles; el badge ×N va en el DOM).
// ---------------------------------------------------------------------------
const STACK = [
  [-1.15, 0, -1.1, 0.12],
  [0.25, 0, -1.25, -0.08],
  [-0.45, H * 0.82, -1.15, 0.05],
  [-2.05, 0, -0.2, 0.2],
] as const;

export function StackedBoxes({ count }: { count: number }) {
  const p = useSceneParams();
  const group = useRef<Group>(null);
  const visible = Math.min(Math.max(count - 1, 0), STACK.length);

  useFrame(() => {
    group.current!.children.forEach((child, i) => {
      const k = backOut(segment(p.contents, 0.3 + i * 0.12, 0.75 + i * 0.08)) * p.stackK * (i < visible ? 1 : 0);
      child.visible = k > 0.001;
      child.scale.setScalar(Math.max(k, 0.001) * 0.82);
    });
  });

  return (
    <group ref={group}>
      {STACK.map(([x, y, z, r], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, r, 0]}>
          <Rounded position={[0, (H + 2 * T) / 2, 0]} size={[W, H + 2 * T, D]} radius={0.02} material={kraftMaterial()} />
          <mesh position={[0, H + 2 * T + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W, 0.2]} />
            <TapeMaterial />
          </mesh>
        </group>
      ))}
    </group>
  );
}
