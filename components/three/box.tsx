"use client";

import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { MeshPhysicalMaterial, type Group, type Mesh } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOX, COLORS, lerp, segment, useSceneParams, type ScenePart } from "./scene-params";
import { getCardboardTextures, getTapeBump } from "./textures";

// Caja procedural: base + 4 paredes con bisagra en la base + 4 solapas con
// bisagra en el borde superior. fold=0 → plantilla plana; fold=1 → caja abierta.

const { w: W, h: H, d: D, t: T } = BOX;
// Solapas abiertas hacia fuera; la frontal casi horizontal para que se vea el interior.
const OPEN_TILT = { front: 1.3, back: 0.55, side: 0.8 };
const FRONT_FLAP = D / 2 - 0.01;
const SIDE_FLAP = W / 2 - 0.01;

// Materiales compartidos: cartón kraft con fibras y ondulado en relieve, y un
// ligero "sheen" para el aspecto aterciopelado del papel.
const materials: { outer?: MeshPhysicalMaterial; inner?: MeshPhysicalMaterial } = {};
export function kraftMaterial(inner = false): MeshPhysicalMaterial {
  const key = inner ? "inner" : "outer";
  if (!materials[key]) {
    const tex = getCardboardTextures();
    materials[key] = new MeshPhysicalMaterial({
      map: inner ? tex.innerMap : tex.map,
      bumpMap: tex.bumpMap,
      bumpScale: 1.2,
      roughness: 0.88,
      metalness: 0,
      color: inner ? "#f2dcc0" : "#e9c79f",
      sheen: 0.15,
      sheenRoughness: 0.8,
      sheenColor: "#ffe2bd",
    });
  }
  return materials[key];
}

/** Plancha de cartón con cantos redondeados (nada de aristas perfectas). */
export function CardPanel({
  size,
  position,
  rotation,
  inner = false,
  radius = 0.009,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  inner?: boolean;
  radius?: number;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 3, radius), [w, h, d, radius]);
  return (
    <mesh geometry={geometry} material={kraftMaterial(inner)} position={position} rotation={rotation} castShadow receiveShadow />
  );
}

type Props = {
  onPart?: (part: ScenePart) => void;
  /** Piezas pegadas por fuera de la pared frontal (etiqueta, sello). */
  front?: React.ReactNode;
  /** Piezas pegadas por fuera de la pared derecha (pegatina internacional). */
  right?: React.ReactNode;
};

export function PackageBox({ onPart, front, right }: Props) {
  const p = useSceneParams();
  const frontWall = useRef<Group>(null);
  const backWall = useRef<Group>(null);
  const leftWall = useRef<Group>(null);
  const rightWall = useRef<Group>(null);
  const frontFlap = useRef<Group>(null);
  const backFlap = useRef<Group>(null);
  const leftFlap = useRef<Group>(null);
  const rightFlap = useRef<Group>(null);

  useFrame(() => {
    // Paredes: plano (±90°) → vertical.
    const fold = 1 - p.fold;
    const flat = (Math.PI / 2) * fold;
    frontWall.current!.rotation.x = flat;
    backWall.current!.rotation.x = -flat;
    leftWall.current!.rotation.z = flat;
    rightWall.current!.rotation.z = -flat;

    // Solapas: alineadas con la pared (plano) → abiertas → cerradas.
    // Primero las laterales (interiores) y después la frontal y la trasera.
    const closeSides = segment(p.close, 0, 0.55);
    const closeFront = segment(p.close, 0.4, 1);
    leftFlap.current!.rotation.z = lerp(OPEN_TILT.side * p.fold, -Math.PI / 2, closeSides);
    rightFlap.current!.rotation.z = lerp(-OPEN_TILT.side * p.fold, Math.PI / 2, closeSides);
    frontFlap.current!.rotation.x = lerp(OPEN_TILT.front * p.fold, -Math.PI / 2, closeFront);
    backFlap.current!.rotation.x = lerp(-OPEN_TILT.back * p.fold, Math.PI / 2, closeFront);
  });

  const click = (part: ScenePart) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onPart?.(part);
  };

  return (
    <group onClick={click("petition")}>
      {/* Base */}
      <CardPanel position={[0, T / 2, 0]} size={[W, T, D]} inner />

      {/* Frontal (+z) */}
      <group ref={frontWall} position={[0, 0, D / 2]}>
        <CardPanel position={[0, H / 2, -T / 2]} size={[W, H, T]} />
        <group ref={frontFlap} position={[0, H + T, -T / 2]}>
          <CardPanel position={[0, FRONT_FLAP / 2, 0]} size={[W, FRONT_FLAP, T]} />
        </group>
        {front}
      </group>

      {/* Trasera (−z) */}
      <group ref={backWall} position={[0, 0, -D / 2]}>
        <CardPanel position={[0, H / 2, T / 2]} size={[W, H, T]} />
        <group ref={backFlap} position={[0, H + T, T / 2]}>
          <CardPanel position={[0, FRONT_FLAP / 2, 0]} size={[W, FRONT_FLAP, T]} />
        </group>
      </group>

      {/* Izquierda (−x) */}
      <group ref={leftWall} position={[-W / 2, 0, 0]}>
        <CardPanel position={[T / 2, H / 2, 0]} size={[T, H, D - 2 * T]} />
        <group ref={leftFlap} position={[T / 2, H, 0]}>
          <CardPanel position={[0, SIDE_FLAP / 2, 0]} size={[T, SIDE_FLAP, D - 2 * T]} />
        </group>
      </group>

      {/* Derecha (+x) */}
      <group ref={rightWall} position={[W / 2, 0, 0]}>
        <CardPanel position={[-T / 2, H / 2, 0]} size={[T, H, D - 2 * T]} />
        <group ref={rightFlap} position={[-T / 2, H, 0]}>
          <CardPanel position={[0, SIDE_FLAP / 2, 0]} size={[T, SIDE_FLAP, D - 2 * T]} />
        </group>
        {right}
      </group>
    </group>
  );
}

/** Cinta marrón de embalar: translúcida, con brillo y micro-arrugas. */
export function TapeMaterial({ opacity = 0.82 }: { opacity?: number }) {
  return (
    <meshPhysicalMaterial
      color={COLORS.tape}
      roughness={0.28}
      clearcoat={1}
      clearcoatRoughness={0.15}
      bumpMap={getTapeBump()}
      bumpScale={0.4}
      transparent
      opacity={opacity}
      polygonOffset
      polygonOffsetFactor={-3}
    />
  );
}

/** Precinto: tira sobre la junta de las solapas + rollo que la recorre. */
export function Tape() {
  const p = useSceneParams();
  const strip = useRef<Mesh>(null);
  const dropLeft = useRef<Group>(null);
  const dropRight = useRef<Group>(null);
  const roll = useRef<Group>(null);
  const top = H + 2 * T + 0.004;

  useFrame(() => {
    const run = segment(p.tape, 0, 0.85);
    const drops = segment(p.tape, 0.85, 1);
    const length = Math.max(run * W, 0.0001);
    strip.current!.scale.x = length;
    strip.current!.position.x = -W / 2 + length / 2;
    strip.current!.visible = p.tape > 0;
    dropLeft.current!.scale.y = dropRight.current!.scale.y = Math.max(drops, 0.0001);
    dropLeft.current!.visible = dropRight.current!.visible = drops > 0;

    const rolling = p.tape > 0 && p.tape < 1;
    roll.current!.visible = rolling;
    roll.current!.position.x = -W / 2 + run * W;
    roll.current!.rotation.z = -run * 12;
    roll.current!.scale.setScalar(rolling ? Math.sin(Math.PI * Math.min(1, p.tape * 1.1)) * 0.5 + 0.5 : 0.001);
  });

  return (
    <group>
      <mesh ref={strip} position={[0, top, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 0.2]} />
        <TapeMaterial />
      </mesh>
      {/* Caídas por los laterales (crecen hacia abajo desde el borde superior) */}
      <group ref={dropLeft} position={[-W / 2 - 0.004, top, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]} position={[0, -0.12, 0]}>
          <planeGeometry args={[0.2, 0.24]} />
          <TapeMaterial />
        </mesh>
      </group>
      <group ref={dropRight} position={[W / 2 + 0.004, top, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]} position={[0, -0.12, 0]}>
          <planeGeometry args={[0.2, 0.24]} />
          <TapeMaterial />
        </mesh>
      </group>
      <group ref={roll} position={[0, top + 0.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.035, 16, 40]} />
          <TapeMaterial opacity={0.95} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.21, 20, 1, true]} />
          <meshStandardMaterial color={COLORS.paper} roughness={0.8} side={2} />
        </mesh>
      </group>
    </group>
  );
}
