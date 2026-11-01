"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import gsap from "gsap";
import type { Transport } from "@/lib/requests/options";
import { COLORS, lerp, segment, useSceneParams, type ScenePart } from "./scene-params";

// Vehículos de reparto modelados con volúmenes redondeados y materiales PBR
// (pintura con barniz, cristal tintado, neumático y llanta). Sin modelos externos.
const ease = gsap.parseEase("power3.out");

function Body({
  size,
  radius,
  position,
  rotation,
  children,
}: {
  size: [number, number, number];
  radius: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  children: React.ReactNode;
}) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 4, radius), [w, h, d, radius]);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow receiveShadow>
      {children}
    </mesh>
  );
}

const Paint = ({ color = "#f4f4f2" }: { color?: string }) => (
  <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.05} clearcoat={1} clearcoatRoughness={0.08} />
);
const Glass = () => <meshPhysicalMaterial color="#1c2430" roughness={0.05} metalness={0.2} clearcoat={1} />;
const Trim = () => <meshStandardMaterial color="#26262b" roughness={0.6} />;

function Wheel({ position, r = 0.16, width = 0.11 }: { position: [number, number, number]; r?: number; width?: number }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <torusGeometry args={[r * 0.72, r * 0.3, 16, 36]} />
        <meshStandardMaterial color={COLORS.tire} roughness={0.92} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r * 0.55, r * 0.55, width * 0.8, 28]} />
        <meshStandardMaterial color="#b9bcc2" roughness={0.25} metalness={0.9} />
      </mesh>
    </group>
  );
}

function Moto() {
  return (
    <group>
      <Wheel position={[-0.42, 0.19, 0]} r={0.19} width={0.08} />
      <Wheel position={[0.42, 0.19, 0]} r={0.19} width={0.08} />
      <Body size={[0.7, 0.22, 0.24]} radius={0.09} position={[0, 0.42, 0]}>
        <Paint color={COLORS.accent} />
      </Body>
      <Body size={[0.38, 0.08, 0.24]} radius={0.035} position={[-0.12, 0.57, 0]}>
        <meshStandardMaterial color="#1b1b1f" roughness={0.7} />
      </Body>
      {/* Baúl de reparto */}
      <Body size={[0.32, 0.3, 0.36]} radius={0.05} position={[-0.42, 0.72, 0]}>
        <Paint />
      </Body>
      <mesh position={[0.36, 0.62, 0]} rotation={[0, 0, -0.35]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 12]} />
        <meshStandardMaterial color="#9a9da3" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={[0.43, 0.82, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.44, 12]} />
        <Trim />
      </mesh>
      <mesh position={[0.5, 0.62, 0]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color="#fff6d8" emissive="#fff1c2" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Furgoneta() {
  return (
    <group>
      <Body size={[1.3, 0.82, 0.76]} radius={0.1} position={[-0.15, 0.62, 0]}>
        <Paint />
      </Body>
      <Body size={[0.44, 0.6, 0.74]} radius={0.12} position={[0.6, 0.5, 0]}>
        <Paint />
      </Body>
      {/* Parabrisas y ventanilla lateral */}
      <Body size={[0.04, 0.26, 0.62]} radius={0.015} position={[0.8, 0.66, 0]} rotation={[0, 0, -0.4]}>
        <Glass />
      </Body>
      <Body size={[0.26, 0.2, 0.02]} radius={0.01} position={[0.58, 0.66, 0.375]}>
        <Glass />
      </Body>
      {/* Franja corporativa */}
      <mesh position={[-0.15, 0.5, 0.382]}>
        <planeGeometry args={[1.2, 0.07]} />
        <meshStandardMaterial color={COLORS.accent} roughness={0.4} />
      </mesh>
      <Body size={[0.06, 0.12, 0.7]} radius={0.02} position={[0.82, 0.26, 0]}>
        <Trim />
      </Body>
      <Wheel position={[-0.5, 0.17, 0.34]} />
      <Wheel position={[-0.5, 0.17, -0.34]} />
      <Wheel position={[0.52, 0.17, 0.34]} />
      <Wheel position={[0.52, 0.17, -0.34]} />
    </group>
  );
}

function Camion() {
  return (
    <group>
      <Body size={[1.5, 1.05, 0.84]} radius={0.06} position={[-0.35, 0.8, 0]}>
        <Paint color="#efefec" />
      </Body>
      <Body size={[0.52, 0.8, 0.82]} radius={0.12} position={[0.7, 0.62, 0]}>
        <Paint color={COLORS.accent} />
      </Body>
      <Body size={[0.04, 0.32, 0.68]} radius={0.015} position={[0.96, 0.8, 0]}>
        <Glass />
      </Body>
      <Body size={[2.1, 0.1, 0.62]} radius={0.03} position={[0, 0.22, 0]}>
        <Trim />
      </Body>
      {[-0.8, -0.45, 0.68].map((x) => (
        <group key={x}>
          <Wheel position={[x, 0.18, 0.39]} r={0.18} />
          <Wheel position={[x, 0.18, -0.39]} r={0.18} />
        </group>
      ))}
    </group>
  );
}

/** Entra rodando desde la derecha en la etapa 4. */
export function Vehicle({ transport, onPart }: { transport: Transport | null; onPart?: (part: ScenePart) => void }) {
  const p = useSceneParams();
  const group = useRef<Group>(null);

  useFrame(() => {
    const k = ease(segment(p.service, 0.15, 1));
    group.current!.visible = Boolean(transport) && k > 0.001;
    group.current!.position.x = lerp(5, 2.05, k);
  });

  const scale = transport === "camion" ? 0.78 : transport === "furgoneta" ? 0.85 : 1;

  return (
    <group
      ref={group}
      position={[5, 0, 0.45]}
      rotation={[0, -0.55, 0]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onPart?.("service");
      }}
    >
      {transport === "moto" ? <Moto /> : transport === "furgoneta" ? <Furgoneta /> : transport === "camion" ? <Camion /> : null}
    </group>
  );
}
