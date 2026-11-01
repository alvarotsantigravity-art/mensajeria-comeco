"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PackageStage } from "@/components/three/package-stage";
import { STAGE_LABELS, type PackageVariant, type ScenePart } from "@/components/three/scene-params";

const PART_LABEL: Record<ScenePart, string> = {
  requester: "01 Solicitante",
  petition: "02 Petición",
  destination: "03 Destino",
  service: "04 Servicio",
};

export function PackageLab() {
  const [stage, setStage] = useState(0);
  const [jump, setJump] = useState(false);
  const [forceStatic, setForceStatic] = useState(false);
  const [lastPart, setLastPart] = useState<ScenePart | null>(null);
  const [labelHover, setLabelHover] = useState(false);
  const [variant, setVariant] = useState<PackageVariant>({
    shipmentType: "caja",
    boxCount: 1,
    urgent: true,
    international: false,
    labelCompany: "Notaría Ejemplo",
    labelCity: "Madrid",
    labelPostalCode: "28009",
    labelRef: "MSJ-2026-0001",
  });
  const set = <K extends keyof PackageVariant>(key: K, value: PackageVariant[K]) =>
    setVariant((v) => ({ ...v, [key]: value }));

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-14">
      <div className="grid content-start gap-6">
        <PackageStage
          stage={stage}
          variant={variant}
          jump={jump}
          forceStatic={forceStatic}
          onPart={setLastPart}
          onLabelHover={setLabelHover}
          className="max-w-md rounded-xl border border-line bg-surface p-3"
        />
        <p className="font-mono text-xs text-muted">
          Clic en la caja → {lastPart ? PART_LABEL[lastPart] : "—"} · Ratón sobre la etiqueta: {labelHover ? "sí (resalta 03 Destino)" : "no"}
        </p>
      </div>

      <div className="grid content-start gap-8">
        <section className="grid gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Etapa</h2>
            <span className="font-mono text-sm">
              {stage} · {STAGE_LABELS[stage]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
            className="w-full accent-[var(--accent)]"
            aria-label="Etapa del paquete"
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0}>
              <ChevronLeft /> Atrás
            </Button>
            <Button size="sm" onClick={() => setStage((s) => Math.min(5, s + 1))} disabled={stage === 5}>
              Siguiente <ChevronRight />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStage(0)}>
              <RotateCcw /> Reiniciar
            </Button>
          </div>
          <Toggle label="Salto corto (como al abrir una solicitud guardada)" checked={jump} onChange={setJump} />
          <Toggle label="Forzar ilustración estática (sin WebGL / movimiento reducido)" checked={forceStatic} onChange={setForceStatic} />
        </section>

        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Envío</h2>
          <div className="flex flex-wrap gap-2">
            {(["documentacion", "caja"] as const).map((type) => (
              <Button
                key={type}
                size="sm"
                variant={variant.shipmentType === type ? "ink" : "outline"}
                onClick={() => set("shipmentType", type)}
              >
                {type === "caja" ? "Caja" : "Documentación"}
              </Button>
            ))}
          </div>
          <Field label={`Nº de cajas (${variant.boxCount})`} htmlFor="lab-boxes">
            <input
              id="lab-boxes"
              type="range"
              min={1}
              max={8}
              value={variant.boxCount}
              onChange={(e) => set("boxCount", Number(e.target.value))}
              disabled={variant.shipmentType !== "caja"}
              className="w-full accent-[var(--accent)]"
            />
          </Field>
          <Toggle label="Urgente (sello rojo)" checked={variant.urgent} onChange={(v) => set("urgent", v)} />
          <Toggle label="Internacional (pegatina)" checked={variant.international} onChange={(v) => set("international", v)} />
        </section>

        <section className="grid gap-4">
          <h2 className="text-lg font-semibold">Etiqueta</h2>
          <Field label="Empresa" htmlFor="lab-company">
            <Input id="lab-company" value={variant.labelCompany} onChange={(e) => set("labelCompany", e.target.value)} />
          </Field>
          <div className="grid grid-cols-[8rem_1fr] gap-3">
            <Field label="CP" htmlFor="lab-cp">
              <Input id="lab-cp" className="font-mono" value={variant.labelPostalCode} onChange={(e) => set("labelPostalCode", e.target.value)} />
            </Field>
            <Field label="Ciudad" htmlFor="lab-city">
              <Input id="lab-city" value={variant.labelCity} onChange={(e) => set("labelCity", e.target.value)} />
            </Field>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
