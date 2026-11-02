"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Download, ExternalLink, LoaderCircle, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  computePackages,
  computePallets,
  formatQuantity,
  noteDate,
  NOTE_COPIES,
  NOTE_FIELDS,
  NOTE_UNITS,
  plural,
  type NoteHeader,
  type NoteUnit,
  type NoteValues,
} from "@/lib/delivery-notes/note";
import { cn } from "@/lib/utils";
import { saveDeliveryNote } from "./actions";

const selectClass = "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent";

export function NoteStudio({
  requestId,
  title,
  header,
  initialValues,
  saved: initiallySaved,
  editable,
}: {
  requestId: string;
  title: string;
  header: NoteHeader;
  initialValues: NoteValues;
  saved: boolean;
  editable: boolean;
}) {
  const [v, setV] = useState(initialValues);
  const [lastSaved, setLastSaved] = useState(initiallySaved ? JSON.stringify(initialValues) : "");
  // Paquetes y palés se calculan solos hasta que alguien los escribe a mano.
  const [manual, setManual] = useState({ packages: initiallySaved && Boolean(initialValues.packages), pallets: initiallySaved && Boolean(initialValues.pallets) });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, startSaving] = useTransition();
  const [printing, setPrinting] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  const autoPackages = computePackages(v);
  const packages = manual.packages ? v.packages : autoPackages !== null ? String(autoPackages) : v.packages;
  const autoPallets = computePallets({ packages, packages_per_pallet: v.packages_per_pallet });
  const pallets = manual.pallets ? v.pallets : autoPallets !== null ? String(autoPallets) : v.pallets;
  const values: NoteValues = { ...v, packages, pallets };
  const dirty = JSON.stringify(values) !== lastSaved;

  const set = (name: keyof NoteValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    if (name === "packages" || name === "pallets") setManual((m) => ({ ...m, [name]: value.trim() !== "" }));
    setV((prev) => ({ ...prev, [name]: value }));
  };

  const pdfUrl = (extra: Record<string, string> = {}) => {
    const q = new URLSearchParams({ solicitud: requestId });
    for (const key of NOTE_FIELDS) q.set(key, values[key]);
    for (const [k, val] of Object.entries(extra)) q.set(k, val);
    return `/api/albaranes?${q}`;
  };

  /** Guarda (si se puede y hay cambios). Devuelve false si los datos no son válidos. */
  async function persist(): Promise<boolean> {
    if (!editable || !dirty) return true;
    const result = await saveDeliveryNote(requestId, values);
    if (!result.ok) {
      setErrors(Object.fromEntries(Object.entries(result.errors ?? {}).map(([k, m]) => [k, m?.[0]])));
      toast.error(result.message);
      return false;
    }
    setErrors({});
    setLastSaved(JSON.stringify(values));
    return true;
  }

  function save() {
    startSaving(async () => {
      if (await persist()) toast.success("Albarán guardado.");
    });
  }

  /** Guarda y lo imprime desde un iframe oculto (mismo origen), sin salir de la página. */
  function print() {
    startSaving(async () => {
      if (!(await persist())) return;
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
    });
  }

  const err = (name: keyof NoteValues) => errors[name];
  const field = (name: keyof NoteValues, label: string, props: React.ComponentProps<typeof Input> = {}, hint?: string, className?: string) => (
    <Field label={label} htmlFor={`n-${name}`} error={err(name)} hint={hint} className={className}>
      <Input id={`n-${name}`} value={values[name]} onChange={set(name)} aria-invalid={Boolean(err(name)) || undefined} {...props} />
    </Field>
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
      {/* Vista previa a escala (la primera copia; el PDF lleva las tres) */}
      <section className="grid content-start gap-4" aria-label="Vista previa">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">
            {title}{" "}
            <Link href={`/solicitudes/${requestId}`} className="text-sm font-normal text-muted underline-offset-4 hover:text-ink hover:underline">
              Ver solicitud
            </Link>
          </p>
          <p className="font-mono text-xs text-muted">3 copias · 3 hojas A4</p>
        </div>
        <Preview header={header} v={values} />
      </section>

      <aside className="grid content-start gap-6">
        {!editable ? (
          <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">
            Es de otro compañero: puedes ajustarlo e imprimirlo, pero no guardar los cambios.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {field("order_number", "Nº Orden", { className: "font-mono" }, "La OP de la solicitud")}
          {field("delivery_date", "Fecha de entrega", { type: "date", className: "font-mono" })}
          {field("origin", "Origen", {}, undefined, "sm:col-span-2")}
          {field("transport_mode", "Modo de transporte", {}, undefined, "sm:col-span-2")}
          {field("comment", "Comentario", {}, undefined, "sm:col-span-2")}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
          {field("quantity", "Cantidad entregada", { inputMode: "decimal", className: "font-mono" }, "Ej.: 6000")}
          <Field label="Unidad" htmlFor="n-unit">
            <select id="n-unit" value={values.unit} onChange={set("unit")} className={selectClass}>
              {NOTE_UNITS.map((u: NoteUnit) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          {field("concept", "Concepto", {}, undefined, "sm:col-span-2")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {field("units_per_package", values.unit === "ej." ? "Ejemplares x paquete" : `${values.unit === "kg" ? "Kg" : "Cajas"} x paquete`, { inputMode: "numeric", className: "font-mono" })}
          {field("packages", "Cantidad de paquetes", { inputMode: "numeric", className: "font-mono" }, manual.packages ? "Escrito a mano" : "Se calcula solo")}
          {field("packages_per_pallet", "Paquetes x palé", { inputMode: "numeric", className: "font-mono" })}
          {field("pallets", "Nº de palés", { inputMode: "numeric", className: "font-mono" }, manual.pallets ? "Escrito a mano" : "Se calcula solo")}
        </div>

        <div className="grid gap-2">
          <Button type="button" size="lg" onClick={print} disabled={printing || saving}>
            {printing ? <LoaderCircle className="animate-spin" /> : <Printer />} Imprimir (3 copias)
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" asChild>
              <a href={pdfUrl({ descargar: "1" })} download onClick={() => void persist()}>
                <Download /> Descargar PDF
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={pdfUrl()} target="_blank" rel="noopener" onClick={() => void persist()}>
                <ExternalLink /> Abrir PDF
              </a>
            </Button>
          </div>
          {editable ? (
            <Button type="button" variant="ghost" onClick={save} disabled={saving || !dirty}>
              {saving ? <LoaderCircle className="animate-spin" /> : <Save />} {dirty ? "Guardar" : "Guardado"}
            </Button>
          ) : null}
          <p className="text-xs text-muted">Imprime a tamaño real (100 %). Sale una hoja por copia: Comeco, transportista y receptor.</p>
        </div>
      </aside>

      <iframe ref={frame} title="Impresión del albarán" className="hidden" aria-hidden />
    </div>
  );
}

/** Miniatura A4 del albarán (cqw = % del ancho de la hoja). */
function Preview({ header, v }: { header: NoteHeader; v: NoteValues }) {
  const cq = (pt: number) => `${(pt * 100) / 595}cqw`; // A4 = 595 pt de ancho
  const box = "border border-[#3a3a40]";
  const perPackage = v.unit === "ej." ? plural(v.units_per_package, "ejemplar") : v.units_per_package ? `${v.units_per_package} ${v.unit}` : "";
  return (
    <div className="@container mx-auto aspect-[210/297] w-full max-w-[36rem] rounded-sm bg-white text-[#111114] shadow-[0_1px_2px_rgb(0_0_0/0.08),0_12px_40px_-12px_rgb(0_0_0/0.25)] ring-1 ring-black/5">
      <div className="flex h-full flex-col" style={{ padding: cq(34), fontSize: cq(9) }}>
        <div className={cn(box, "grid grid-cols-[42%_30%_28%]")} style={{ height: cq(113) }}>
          <div className="flex flex-col justify-end border-r border-[#3a3a40]" style={{ padding: cq(7) }}>
            <span className="font-bold" style={{ fontSize: cq(12) }}>{header.legal.name}</span>
            <span style={{ fontSize: cq(7.5) }}>{header.legal.address}</span>
            <span style={{ fontSize: cq(7.5) }}>N.I.F. {header.legal.taxId}</span>
          </div>
          <div className="flex flex-col justify-center border-r border-[#3a3a40]" style={{ padding: cq(7), gap: cq(5), fontSize: cq(10) }}>
            {NOTE_COPIES.map((c, i) => (
              <span key={c} className="flex items-center" style={{ gap: cq(5) }}>
                <span className="inline-grid place-items-center border border-black" style={{ width: cq(9), height: cq(9) }}>
                  {i === 0 ? <span className="bg-black" style={{ width: cq(5.5), height: cq(5.5) }} /> : null}
                </span>
                {c}
              </span>
            ))}
          </div>
          <div className="grid place-content-center text-center leading-tight" style={{ fontSize: cq(22) }}>
            <span>ALBARÁN</span>
            <span>ENTREGA</span>
          </div>
        </div>
        <div className={cn(box, "grid grid-cols-[42%_58%] border-t-0")} style={{ fontSize: cq(10) }}>
          <span className="border-r border-[#3a3a40]" style={{ padding: cq(7) }}>
            Nº Orden: {v.order_number}
          </span>
          <span style={{ padding: cq(7) }}>
            Nº Albarán: {header.ref} - <b>Fecha de Entrega:</b> {v.delivery_date ? noteDate(v.delivery_date) : ""}
          </span>
        </div>
        <div className={cn(box, "grid grid-cols-2 border-t-0")} style={{ height: cq(159), fontSize: cq(10) }}>
          <div className="grid content-start border-r border-[#3a3a40]" style={{ padding: cq(7) }}>
            <span>ORIGEN: {v.origin}</span>
            <span>Modo Transporte: {v.transport_mode}</span>
            <span>Comentario: {v.comment}</span>
          </div>
          <div className="flex flex-col justify-between" style={{ padding: cq(7), fontSize: cq(11) }}>
            <span>
              <span style={{ fontSize: cq(10) }}>Dirección de entrega:</span>
              <br />
              {header.address.company}
            </span>
            <span>{header.address.address}</span>
            <span>{header.address.place}</span>
          </div>
        </div>
        <div className={cn(box, "grid grid-cols-[18%_82%] bg-[#d4d4d8] font-bold")} style={{ marginTop: cq(40), fontSize: cq(8.5) }}>
          <span className="border-r border-[#3a3a40] text-center" style={{ padding: cq(5) }}>
            CANTIDAD ENTREGADA
          </span>
          <span className="grid place-content-center">CONCEPTO</span>
        </div>
        <div className="flex items-baseline" style={{ padding: `${cq(11)} ${cq(23)}`, gap: cq(4) }}>
          <span style={{ fontSize: cq(16) }}>{formatQuantity(v.quantity)}</span>
          <span style={{ fontSize: cq(9), marginRight: cq(8) }}>{v.quantity ? v.unit : ""}</span>
          <span style={{ fontSize: cq(12) }}>{v.concept}</span>
        </div>
        <div className="border-t border-[#3a3a40]" style={{ marginTop: cq(17), padding: `${cq(17)} ${cq(34)} 0`, fontSize: cq(10.5) }}>
          <p>
            <b>{v.unit === "ej." ? "Ejemplares" : v.unit === "kg" ? "Kg" : "Cajas"} x paquete:</b> {perPackage}
          </p>
          <p>
            <b>Cantidad de paquetes:</b> {plural(v.packages, "paquete")}
          </p>
          <p>
            <b>Paquetes x palé:</b> {plural(v.packages_per_pallet, "paquete")}
          </p>
          <p style={{ marginTop: cq(8) }}>
            <b>Nº palés:</b> {plural(v.pallets, "palé")}
          </p>
        </div>
        <div className={cn(box, "grid grid-cols-2")} style={{ marginTop: cq(23), minHeight: cq(108) }}>
          <div className="flex flex-col justify-between border-r border-[#3a3a40]" style={{ padding: cq(7) }}>
            <span className="font-bold" style={{ fontSize: cq(10) }}>
              Recibí: <span style={{ marginLeft: cq(30) }}>Firma y sello:</span>
            </span>
            <span style={{ fontSize: cq(7.5) }}>Generado: {header.generated}</span>
          </div>
          <p className="text-justify" style={{ padding: cq(7), fontSize: cq(7), lineHeight: 1.3 }}>
            {header.legal.waste}
          </p>
        </div>
        <div style={{ marginTop: cq(3), fontSize: cq(7) }}>
          {header.legal.footer.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
