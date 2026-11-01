"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Download, ExternalLink, LoaderCircle, Printer, Ruler, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { buildLabels, recipientLines, type LabelData, type LabelOptions, type LabelSender, type LabelSource } from "@/lib/labels/label-data";
import { FORMAT_KEYS, LABEL_FORMATS, OFFSET_LIMIT, planSheets, fontScale, type LabelFormat, type LabelOffsets } from "@/lib/labels/layouts";
import { cn } from "@/lib/utils";
import { saveLabelOffsets } from "./actions";

type Target = { kind: "solicitud" | "destinatario"; id: string };

/** pt del PDF → % del ancho de la hoja (210 mm), para que la vista previa sea a escala. */
const cq = (pt: number) => `${(pt * 0.3528 * 100) / 210}cqw`;

export function LabelStudio({
  target,
  source,
  sender,
  initialOffsets,
  isAdmin,
}: {
  target: Target;
  source: LabelSource & { title: string };
  sender: LabelSender;
  initialOffsets: LabelOffsets;
  isAdmin: boolean;
}) {
  const [format, setFormat] = useState<LabelFormat>(source.documentation ? "4" : source.boxCount > 2 ? "8" : "4");
  const [start, setStart] = useState(1);
  const [parcels, setParcels] = useState(source.documentation ? 1 : source.boxCount);
  const [urgent, setUrgent] = useState(source.urgent);
  const [fragile, setFragile] = useState(false);
  const [documentation, setDocumentation] = useState(source.documentation);
  const [notes, setNotes] = useState("");
  const [offsets, setOffsets] = useState(initialOffsets);
  const [printing, setPrinting] = useState(false);
  const [saving, startSaving] = useTransition();
  const frame = useRef<HTMLIFrameElement>(null);

  const perPage = LABEL_FORMATS[format].perPage;
  const safeStart = Math.min(start, perPage);
  const options: LabelOptions = {
    formato: format,
    inicio: safeStart,
    bultos: parcels,
    urgente: urgent ? "1" : "0",
    fragil: fragile ? "1" : "0",
    documentacion: documentation ? "1" : "0",
    obs: notes,
  };
  const labels = useMemo(() => buildLabels(source, sender, options), [source, sender, format, safeStart, parcels, urgent, fragile, documentation, notes]); // eslint-disable-line react-hooks/exhaustive-deps
  const sheets = planSheets(labels, format, safeStart);

  const pdfUrl = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ [target.kind]: target.id });
    for (const [k, v] of Object.entries({ ...options, ...extra })) if (v !== undefined && v !== "") q.set(k, String(v));
    return `/api/labels?${q}`;
  };

  /** Imprime el PDF desde un iframe oculto (mismo origen), sin salir de la página. */
  function print() {
    const iframe = frame.current;
    if (!iframe) return;
    setPrinting(true);
    iframe.onload = () => {
      setPrinting(false);
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.open(iframe.src, "_blank", "noopener");
      }
    };
    iframe.src = pdfUrl();
  }

  function saveCalibration() {
    startSaving(async () => {
      const result = await saveLabelOffsets(offsets);
      if (!result.ok) return void toast.error(result.message);
      setOffsets(result.offsets);
      toast.success("Calibración guardada para toda la oficina.");
    });
  }

  const backHref = target.kind === "solicitud" ? `/solicitudes/${target.id}` : `/libreta/${target.id}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
      {/* Vista previa de la hoja A4 a escala */}
      <section className="grid content-start gap-4" aria-label="Vista previa">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">
            {source.title}{" "}
            <Link href={backHref} className="text-sm font-normal text-muted underline-offset-4 hover:text-ink hover:underline">
              {target.kind === "solicitud" ? "Ver solicitud" : "Ver ficha"}
            </Link>
          </p>
          <p className="font-mono text-xs text-muted">
            {labels.length} {labels.length === 1 ? "etiqueta" : "etiquetas"} · {sheets.length} {sheets.length === 1 ? "hoja" : "hojas"}
          </p>
        </div>
        {!source.recipient.company || !source.recipient.address ? (
          <p role="status" className="rounded-lg border border-urgent/30 bg-urgent/8 px-4 py-3 text-sm">
            Faltan datos del destino (empresa o dirección). Complétalos antes de imprimir.
          </p>
        ) : null}
        <div className="grid gap-8">
          {sheets.map((slots, p) => (
            <figure key={p} className="grid gap-2">
              <div
                className="@container relative mx-auto aspect-[210/297] w-full max-w-[34rem] overflow-hidden rounded-sm bg-white text-[#111114] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5"
                style={{ display: "grid", gridTemplateColumns: `repeat(${LABEL_FORMATS[format].cols}, 1fr)`, gridTemplateRows: `repeat(${LABEL_FORMATS[format].rows}, 1fr)` }}
              >
                {slots.map((label, i) => {
                  const used = p === 0 && i < safeStart - 1;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={p !== 0}
                      onClick={() => setStart(i + 1)}
                      title={p === 0 ? `Empezar en la posición ${i + 1}` : undefined}
                      aria-label={p === 0 ? `Empezar en la posición ${i + 1}` : `Posición ${i + 1}`}
                      aria-pressed={p === 0 ? i + 1 === safeStart : undefined}
                      className={cn(
                        "relative min-h-0 min-w-0 overflow-hidden border border-dashed border-black/15 text-left outline-none transition-colors",
                        p === 0 && "cursor-pointer hover:bg-[#2F4BFF]/5 focus-visible:bg-[#2F4BFF]/10",
                        used && "bg-[repeating-linear-gradient(135deg,rgb(0_0_0/0.05)_0_6px,transparent_6px_12px)]",
                      )}
                    >
                      {used ? (
                        <span className="absolute inset-0 grid place-items-center font-mono text-[10px] text-black/40">ya usada</span>
                      ) : label ? (
                        <MiniLabel label={label} format={format} />
                      ) : null}
                      <span className="absolute top-1 right-1.5 font-mono text-[9px] text-black/30">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
              {sheets.length > 1 ? (
                <figcaption className="text-center font-mono text-xs text-muted">
                  Hoja {p + 1} de {sheets.length}
                </figcaption>
              ) : null}
            </figure>
          ))}
        </div>
        <p className="text-center text-sm text-muted">Pulsa una posición de la primera hoja para empezar ahí y aprovechar hojas ya usadas.</p>
      </section>

      {/* Controles */}
      <aside className="grid content-start gap-8 lg:sticky lg:top-24">
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[13px] font-medium tracking-tight">Formato A4</legend>
          {FORMAT_KEYS.map((key) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm transition-colors hover:border-ink/30 has-[:checked]:border-accent has-[:checked]:bg-accent/5 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/40"
            >
              <input type="radio" name="formato" value={key} checked={format === key} onChange={() => setFormat(key)} className="size-4 accent-[var(--accent)]" />
              <span className="grid">
                <span className="font-medium">{LABEL_FORMATS[key].name}</span>
                <span className="text-xs text-muted">{LABEL_FORMATS[key].hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Empezar en" htmlFor="inicio">
            <select
              id="inicio"
              value={safeStart}
              onChange={(e) => setStart(Number(e.target.value))}
              className="h-10 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
            >
              {Array.from({ length: perPage }, (_, i) => (
                <option key={i} value={i + 1}>
                  Posición {i + 1}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Bultos" htmlFor="bultos" hint={documentation ? "Documentación: suele ser 1" : undefined}>
            <Input
              id="bultos"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={parcels}
              onChange={(e) => setParcels(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="font-mono"
            />
          </Field>
        </div>

        <fieldset className="grid gap-2.5">
          <legend className="mb-2 text-[13px] font-medium tracking-tight">Distintivos</legend>
          {(
            [
              ["URGENTE", urgent, setUrgent],
              ["FRÁGIL", fragile, setFragile],
              ["DOCUMENTACIÓN", documentation, setDocumentation],
            ] as const
          ).map(([label, checked, set]) => (
            <label key={label} className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              {label}
            </label>
          ))}
        </fieldset>

        <Field label="Observaciones" htmlFor="obs" hint={`${notes.length}/140 · Salen en todas las etiquetas.`}>
          <Input id="obs" value={notes} maxLength={140} onChange={(e) => setNotes(e.target.value)} placeholder="Entregar en recepción, planta 2…" />
        </Field>

        <div className="grid gap-2">
          <Button type="button" size="lg" onClick={print} disabled={printing}>
            {printing ? <LoaderCircle className="animate-spin" /> : <Printer />} Imprimir
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <a href={pdfUrl({ descargar: "1" })} download>
                <Download /> Descargar PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={pdfUrl()} target="_blank" rel="noopener">
                <ExternalLink /> Abrir PDF
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted">Imprime a tamaño real (100 %), sin «Ajustar a la página».</p>
        </div>

        <details className="group rounded-xl border border-line bg-surface p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
            <Ruler className="size-4" /> Calibrar la impresora
            {offsets.top || offsets.left ? (
              <Badge className="ml-auto font-mono">
                {offsets.top} / {offsets.left} mm
              </Badge>
            ) : null}
          </summary>
          <div className="mt-4 grid gap-4 text-sm">
            <p className="text-muted">
              Imprime la hoja de prueba en papel normal, ponla sobre una hoja de etiquetas a contraluz y mide cuánto se
              desplaza. Positivo = hacia abajo / hacia la derecha.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(["top", "left"] as const).map((side) => (
                <Field key={side} label={side === "top" ? "Vertical (mm)" : "Horizontal (mm)"} htmlFor={`offset-${side}`}>
                  <Input
                    id={`offset-${side}`}
                    type="number"
                    step={0.5}
                    min={-OFFSET_LIMIT}
                    max={OFFSET_LIMIT}
                    value={offsets[side]}
                    disabled={!isAdmin}
                    onChange={(e) => setOffsets((o) => ({ ...o, [side]: Number(e.target.value) || 0 }))}
                    className="font-mono"
                  />
                </Field>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={pdfUrl({ bordes: "1" })} target="_blank" rel="noopener">
                  <Printer /> Hoja de prueba
                </a>
              </Button>
              {isAdmin ? (
                <Button size="sm" onClick={saveCalibration} disabled={saving}>
                  {saving ? <LoaderCircle className="animate-spin" /> : <Save />} Guardar
                </Button>
              ) : (
                <span className="self-center text-xs text-muted">Solo un administrador puede cambiarla.</span>
              )}
            </div>
            {isAdmin ? <p className="text-xs text-muted">La hoja de prueba usa la calibración guardada.</p> : null}
          </div>
        </details>
      </aside>

      <iframe ref={frame} title="PDF para imprimir" className="pointer-events-none fixed size-px opacity-0" aria-hidden tabIndex={-1} />
    </div>
  );
}

/** Miniatura fiel (a escala) de la etiqueta del PDF. */
function MiniLabel({ label, format }: { label: LabelData; format: LabelFormat }) {
  const k = fontScale(format);
  const r = label.recipient;
  const pad = `${(5 * k * 100) / 210}cqw`;
  return (
    <span className="absolute inset-0 flex flex-col leading-tight" style={{ padding: pad }}>
      <span className="flex items-start justify-between gap-1">
        <span className="text-black/50" style={{ fontSize: cq(5.5 * k) }}>
          REMITENTE · {label.sender.name}
        </span>
        <span className="flex gap-1 font-bold" style={{ fontSize: cq(5.5 * k) }}>
          {label.urgent ? <span className="text-[#D92D20]">■ URGENTE</span> : null}
          {label.fragile ? <span>■ FRÁGIL</span> : null}
          {label.documentation ? <span>■ DOC.</span> : null}
        </span>
      </span>
      <span className="mt-[1.5cqw] flex min-h-0 flex-1 flex-col">
        <span className="line-clamp-2 font-bold" style={{ fontSize: cq(14 * k) }}>
          {r.company || "—"}
        </span>
        {r.contact ? <span className="truncate" style={{ fontSize: cq(8.5 * k) }}>A la atención de: {r.contact}</span> : null}
        {recipientLines(r).map((line, i) => (
          <span key={i} className={cn("truncate", i === 1 && "font-bold")} style={{ fontSize: cq(10 * k) }}>
            {line}
          </span>
        ))}
        {r.phone ? <span style={{ fontSize: cq(8.5 * k) }}>Tel. {r.phone}</span> : null}
      </span>
      <span className="flex items-end justify-between gap-1">
        <span className="grid min-w-0">
          {label.notes ? <span className="truncate" style={{ fontSize: cq(7 * k) }}>Obs.: {label.notes}</span> : null}
          <span className="font-mono font-bold" style={{ fontSize: cq(7.5 * k) }}>
            {label.ref} <span className="font-normal text-black/50">{label.date}</span>
          </span>
        </span>
        {label.parcel ? (
          <span className="font-bold whitespace-nowrap" style={{ fontSize: cq(11 * k) }}>
            Bulto {label.parcel.index}/{label.parcel.total}
          </span>
        ) : null}
        {label.qr ? (
          <span
            aria-hidden
            className="shrink-0 bg-[conic-gradient(#111_25%,#fff_0_50%,#111_0_75%,#fff_0)] bg-[length:25%_25%]"
            style={{ width: `${(15 * k * 100) / 210}cqw`, height: `${(15 * k * 100) / 210}cqw` }}
          />
        ) : null}
      </span>
    </span>
  );
}
