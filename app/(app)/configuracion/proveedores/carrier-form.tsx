"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { EMAIL_LAYOUT_LABEL, EMAIL_LAYOUTS, FORM_KIND_LABEL, FORM_KINDS, type Carrier } from "@/lib/carriers/types";
import { saveCarrier, type CarrierFormState } from "./actions";

const selectClass = "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent";

/** Ficha de un proveedor (edición) o alta de uno nuevo (sin `carrier`). */
export function CarrierForm({ carrier, placeholders }: { carrier?: Carrier; placeholders: string[] }) {
  const [state, action, pending] = useActionState<CarrierFormState, FormData>(saveCarrier, {});
  const creating = !carrier;
  const e = (name: string) => state.errors?.[name]?.[0];
  const id = (name: string) => `${carrier?.slug ?? "nuevo"}-${name}`;

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="mode" value={creating ? "create" : "update"} />
      {creating ? null : <input type="hidden" name="slug" value={carrier.slug} />}

      <div className="grid gap-5 sm:grid-cols-6">
        <Field label="Nombre" htmlFor={id("name")} error={e("name")} className="sm:col-span-3">
          <Input id={id("name")} name="name" defaultValue={carrier?.name} />
        </Field>
        {creating ? (
          <Field label="Identificador" htmlFor={id("slug")} error={e("slug")} hint="Ej.: seur. No se puede cambiar." className="sm:col-span-3">
            <Input id={id("slug")} name="slug" className="font-mono" />
          </Field>
        ) : null}
        <Field label="Prefijo" htmlFor={id("ref_prefix")} error={e("ref_prefix")} hint="Ej.: BOY → BOY-2026-0001" className="sm:col-span-2">
          <Input id={id("ref_prefix")} name="ref_prefix" className="font-mono uppercase" defaultValue={carrier?.refPrefix} maxLength={5} />
        </Field>
        <Field label="Orden" htmlFor={id("sort_order")} className="sm:col-span-1">
          <Input id={id("sort_order")} name="sort_order" type="number" min={0} max={999} className="font-mono" defaultValue={carrier?.sortOrder ?? 100} />
        </Field>

        <Field label="Formulario" htmlFor={id("form_kind")} error={e("form_kind")} className="sm:col-span-3">
          <select id={id("form_kind")} name="form_kind" defaultValue={carrier?.formKind ?? "transporte"} className={selectClass}>
            {FORM_KINDS.map((k) => (
              <option key={k} value={k}>
                {FORM_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Correo" htmlFor={id("email_layout")} error={e("email_layout")} className="sm:col-span-3">
          <select id={id("email_layout")} name="email_layout" defaultValue={carrier?.emailLayout ?? "tabla"} className={selectClass}>
            {EMAIL_LAYOUTS.map((k) => (
              <option key={k} value={k}>
                {EMAIL_LAYOUT_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Para" htmlFor={id("email_to")} error={e("email_to")} hint="Separados por comas. Nunca @comecografico.com." className="sm:col-span-6">
          <Input id={id("email_to")} name="email_to" className="font-mono" defaultValue={carrier?.emailTo.join(", ")} />
        </Field>
        <Field label="CC por defecto" htmlFor={id("email_cc")} error={e("email_cc")} hint="Opcional. Se puede cambiar en cada solicitud." className="sm:col-span-6">
          <Input id={id("email_cc")} name="email_cc" className="font-mono" defaultValue={carrier?.emailCc.join(", ")} />
        </Field>
        <Field
          label="Asunto"
          htmlFor={id("subject_template")}
          error={e("subject_template")}
          hint={`Marcadores: ${placeholders.map((p) => `{${p}}`).join(" ")}. Un tramo entre [corchetes] se quita si algún marcador está vacío.`}
          className="sm:col-span-6"
        >
          <Textarea id={id("subject_template")} name="subject_template" rows={2} className="font-mono text-xs" defaultValue={carrier?.subjectTemplate} />
        </Field>

        <Field label="Frase inicial" htmlFor={id("email_intro")} error={e("email_intro")} hint="Transporte. Ej.: Necesitamos transporte para" className="sm:col-span-4">
          <Input id={id("email_intro")} name="email_intro" defaultValue={carrier?.emailIntro} />
        </Field>
        <Field label="Nombre en el saludo" htmlFor={id("greeting_name")} error={e("greeting_name")} hint="Ej.: Rafa → «Buenos días Rafa,»" className="sm:col-span-2">
          <Input id={id("greeting_name")} name="greeting_name" defaultValue={carrier?.greetingName} />
        </Field>
        <Field label="Código de cliente" htmlFor={id("customer_code")} error={e("customer_code")} hint="Ej.: TIPSA 09211" className="sm:col-span-2">
          <Input id={id("customer_code")} name="customer_code" className="font-mono" defaultValue={carrier?.customerCode} />
        </Field>
        <Field label="Tipos de servicio" htmlFor={id("service_options")} error={e("service_options")} hint="Uno por línea. Vacío: no se pregunta." className="sm:col-span-4">
          <Textarea id={id("service_options")} name="service_options" rows={2} defaultValue={carrier?.serviceOptions.join("\n")} />
        </Field>

        <label className="flex items-center gap-3 text-sm sm:col-span-3">
          <input type="checkbox" name="uses_codes" defaultChecked={carrier?.usesCodes ?? false} className="size-4 accent-[var(--accent)]" />
          Usa códigos de recogida y entrega
        </label>
        <label className="flex items-center gap-3 text-sm sm:col-span-3">
          <input type="checkbox" name="active" defaultChecked={carrier?.active ?? true} className="size-4 accent-[var(--accent)]" />
          Activo (aparece al crear solicitudes)
        </label>
      </div>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />} {creating ? "Crear proveedor" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
