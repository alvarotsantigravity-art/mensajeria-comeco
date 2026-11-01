"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bookmark, Check, ClipboardCopy, Cloud, CloudOff, LoaderCircle, Mail, Save, Sparkles, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge, SectionHeading } from "@/components/ui/misc";
import { ChoiceGroup } from "@/components/requests/choice-group";
import { EmailPreview } from "@/components/requests/email-preview";
import { BLOCKS, ProgressSteps } from "@/components/requests/progress-steps";
import { PackageStage } from "@/components/three/package-stage";
import { RecipientCombobox } from "@/components/requests/recipient-combobox";
import type { PackageVariant, ScenePart } from "@/components/three/scene-params";
import { useShipmentProgress } from "@/hooks/use-shipment-progress";
import { buildEmailBody, buildSubject } from "@/lib/email/build-body";
import { buildEmailHtml } from "@/lib/email/build-html";
import { buildGmailUrl, GMAIL_URL_LIMIT } from "@/lib/email/gmail-url";
import type { EditorSettings } from "@/lib/requests/data";
import {
  SCOPE_EMAIL,
  SCOPES,
  SHIPMENT_TYPE_EMAIL,
  STATUS_LABEL,
  TRANSPORT_EMAIL,
  TRANSPORTS,
  URGENCIES,
  URGENCY_EMAIL,
  type Status,
} from "@/lib/requests/options";
import { provinceFromPostalCode } from "@/lib/requests/provinces";
import { BLOCK_ORDER, parseEmailList, requestSchema, type RequestFormValues } from "@/lib/requests/schema";
import { getSuggestions } from "@/lib/requests/suggestions";
import { saveRequest } from "@/app/(app)/solicitudes/actions";
import { saveTemplate } from "@/app/(app)/solicitudes/template-actions";
import type { RecipientOption } from "@/app/(app)/libreta/actions";
import { withRecipient } from "@/lib/requests/prefill";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";
type AsideTab = "paquete" | "correo";

const AUTOSAVE_DELAY = 1200;

const urgencyOptions = URGENCIES.map((value) => ({ value, label: URGENCY_EMAIL[value] }));
const scopeOptions = SCOPES.map((value) => ({ value, label: SCOPE_EMAIL[value] }));
const transportOptions = TRANSPORTS.map((value) => ({ value, label: TRANSPORT_EMAIL[value] }));
const shipmentTypeOptions = [
  { value: "documentacion", label: SHIPMENT_TYPE_EMAIL.documentacion, hint: "Sobre o carpeta" },
  { value: "caja", label: SHIPMENT_TYPE_EMAIL.caja, hint: "Indica cuántas" },
];

const hasContent = (v: RequestFormValues) => Boolean(v.concept.trim() || v.description.trim() || v.dest_company.trim());

export function RequestEditor({
  initialId,
  initialRef,
  initialStatus,
  initialValues,
  settings,
  gmailAccount,
  readOnly = false,
}: {
  initialId: string | null;
  initialRef: string | null;
  initialStatus: Status;
  initialValues: RequestFormValues;
  settings: EditorSettings;
  gmailAccount: string;
  readOnly?: boolean;
}) {
  const form = useForm<RequestFormValues>({
    defaultValues: initialValues,
    // El esquema transforma (minúsculas, tipos); aquí solo se usan sus errores.
    resolver: zodResolver(requestSchema) as unknown as Resolver<RequestFormValues>,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { register, control, setValue, getValues, formState } = form;
  const values = useWatch({ control }) as RequestFormValues;
  const progress = useShipmentProgress(values);
  const err = (name: keyof RequestFormValues) => formState.errors[name]?.message;

  const [ref, setRef] = useState(initialRef);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>(initialId ? "saved" : "idle");
  const idRef = useRef(initialId);
  const lastSaved = useRef(JSON.stringify(initialValues));
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const cc = useMemo(() => parseEmailList(values.email_cc), [values.email_cc]);
  const subject = buildSubject(settings.subject_template, values);
  const body = buildEmailBody(values);
  const suggestions = getSuggestions(values, settings.office_province);
  const sent = status !== "borrador";

  // Escena 3D: avanza con los bloques completos y se precinta al enviar.
  const [tab, setTab] = useState<AsideTab>("paquete");
  const [labelHover, setLabelHover] = useState(false);
  const variant = useMemo<PackageVariant>(
    () => ({
      shipmentType: (values.shipment_type || null) as PackageVariant["shipmentType"],
      boxCount: Math.max(1, Number(values.box_count) || 1),
      urgent: values.urgency === "urgente",
      international: values.scope === "internacional",
      transport: (values.transport || null) as PackageVariant["transport"],
      labelCompany: values.dest_company,
      labelCity: values.dest_city,
      labelPostalCode: values.dest_postal_code,
      labelRef: ref ?? "",
    }),
    [values.shipment_type, values.box_count, values.urgency, values.scope, values.transport, values.dest_company, values.dest_city, values.dest_postal_code, ref],
  );
  const goToBlock = useCallback((part: ScenePart) => {
    const block = BLOCKS.find((b) => b.key === part);
    document.getElementById(block?.anchor ?? "")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /** Guardados en serie: nunca dos a la vez (el primero crea la fila y fija el id). */
  const persist = useCallback(
    (send: boolean) => {
      const run = async () => {
        const snapshot = getValues();
        const serialized = JSON.stringify(snapshot);
        if (!send && serialized === lastSaved.current && idRef.current) return true;

        setSaveState("saving");
        const result = await saveRequest({ id: idRef.current, values: snapshot, send });
        if (!result.ok) {
          setSaveState("error");
          if (result.errors) {
            for (const [name, messages] of Object.entries(result.errors)) {
              if (messages?.[0]) form.setError(name as keyof RequestFormValues, { message: messages[0] });
            }
          }
          toast.error(result.message);
          return false;
        }

        if (!idRef.current) window.history.replaceState(null, "", `/solicitudes/${result.id}`);
        idRef.current = result.id;
        lastSaved.current = serialized;
        setRef(result.ref);
        setStatus(result.status);
        setSaveState("saved");
        if (send && result.recipientId !== snapshot.recipient_id) {
          setValue("recipient_id", result.recipientId);
          setValue("save_recipient", false);
          lastSaved.current = JSON.stringify(getValues());
        }
        return true;
      };
      const next = queue.current.then(run, run);
      queue.current = next;
      return next;
    },
    [form, getValues, setValue],
  );

  // Autoguardado del borrador con debounce. No crea filas vacías.
  useEffect(() => {
    if (readOnly) return;
    if (!idRef.current && !hasContent(values)) return;
    if (JSON.stringify(values) === lastSaved.current) return;
    const timer = setTimeout(() => void persist(false), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [values, persist, readOnly]);

  // Aviso al cerrar la pestaña con cambios sin guardar.
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!readOnly && JSON.stringify(getValues()) !== lastSaved.current && hasContent(getValues())) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [getValues, readOnly]);

  function focusFirstError() {
    const order = BLOCK_ORDER.flatMap((block) => Object.keys(BLOCK_FIELDS[block])) as (keyof RequestFormValues)[];
    const first = order.find((name) => form.getFieldState(name).error);
    if (first) form.setFocus(first);
  }

  async function openInGmail() {
    const snapshot = getValues();
    if (!requestSchema.safeParse(snapshot).success) {
      await form.trigger();
      focusFirstError();
      toast.error("Faltan datos: revisa los campos marcados.");
      return;
    }

    const message = {
      to: settings.courier_to,
      cc: parseEmailList(snapshot.email_cc),
      subject: buildSubject(settings.subject_template, snapshot),
      authuser: gmailAccount,
    };
    const fullBody = buildEmailBody(snapshot);
    let url = buildGmailUrl({ ...message, body: fullBody });
    if (url.length > GMAIL_URL_LIMIT) {
      // URL demasiado larga: Gmail se abre sin cuerpo y el texto va al portapapeles.
      await navigator.clipboard.writeText(fullBody).catch(() => undefined);
      url = buildGmailUrl(message);
      toast.info("El correo es largo: lo he copiado. Pégalo en Gmail con Ctrl+V.");
    }
    window.open(url, "_blank", "noopener,noreferrer");

    if (await persist(true)) toast.success("Solicitud marcada como enviada.");
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success("Correo copiado como texto.");
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function copyHtml() {
    try {
      const html = buildEmailHtml(values);
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([body], { type: "text/plain" }),
        }),
      ]);
      toast.success("Correo copiado como tabla. Pégalo en Gmail.");
    } catch {
      toast.error("Tu navegador no permite copiar HTML; usa Copiar texto.");
    }
  }

  /** Al elegir un destinatario de la libreta se rellena todo el bloque de destino. */
  function selectRecipient(option: RecipientOption) {
    const next = withRecipient(getValues(), option);
    for (const name of DEST_FIELDS) {
      setValue(name, next[name], { shouldDirty: true, shouldValidate: formState.isSubmitted });
    }
    toast.success(`Destino: ${option.company_name}`);
  }

  function clearRecipient() {
    setValue("recipient_id", null, { shouldDirty: true });
    setValue("save_recipient", true, { shouldDirty: true });
  }

  async function saveAsTemplate() {
    const name = window.prompt("Nombre de la plantilla (p. ej. «Documentación a notaría X»):", values.concept || values.dest_company);
    if (name === null) return;
    const result = await saveTemplate(name, getValues());
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }

  function onPostalCodeBlur() {
    const province = provinceFromPostalCode(getValues("dest_postal_code"));
    if (province && !getValues("dest_province").trim()) {
      setValue("dest_province", province, { shouldDirty: true });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.82fr)] lg:gap-14">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void openInGmail();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !readOnly) {
            event.preventDefault();
            void openInGmail();
          }
        }}
        className="grid gap-14"
      >
        <header className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted">{ref ?? "Sin guardar"}</span>
            <Badge tone={status === "borrador" ? "neutral" : status === "cancelada" ? "urgent" : "success"}>
              {STATUS_LABEL[status]}
            </Badge>
            {!readOnly ? <SaveIndicator state={saveState} /> : null}
          </div>
          <h1 className="animate-rise text-display font-semibold">
            {readOnly ? "Solicitud." : initialId ? "Editar solicitud." : "Nueva solicitud."}
          </h1>
          {readOnly ? (
            <p className="max-w-prose text-muted">Es de otro compañero: puedes verla y copiar el correo, pero no editarla.</p>
          ) : null}
        </header>

        <fieldset disabled={readOnly} className="grid gap-14">
          {/* 01 · Solicitante */}
          <section id={BLOCKS[0].anchor} className="grid scroll-mt-24 gap-6">
            <SectionHeading index="01" title="Solicitante" description="Sale de tu perfil. Cámbialo solo para esta solicitud si hace falta." />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Fecha" htmlFor="request_date" error={err("request_date")}>
                <Input id="request_date" type="date" className="font-mono" {...register("request_date")} aria-invalid={Boolean(err("request_date")) || undefined} />
              </Field>
              <Field label="Solicitante" htmlFor="requester_name" error={err("requester_name")}>
                <Input id="requester_name" autoComplete="name" {...register("requester_name")} aria-invalid={Boolean(err("requester_name")) || undefined} />
              </Field>
              <Field label="Teléfono" htmlFor="requester_phone" error={err("requester_phone")}>
                <Input id="requester_phone" type="tel" autoComplete="tel" className="font-mono" {...register("requester_phone")} aria-invalid={Boolean(err("requester_phone")) || undefined} />
              </Field>
              <Field label="Email" htmlFor="requester_email" error={err("requester_email")}>
                <Input id="requester_email" type="email" autoComplete="email" className="font-mono" {...register("requester_email")} aria-invalid={Boolean(err("requester_email")) || undefined} />
              </Field>
              <Field label="Sociedad / empresa" htmlFor="company" error={err("company")}>
                <Input id="company" autoComplete="organization" {...register("company")} aria-invalid={Boolean(err("company")) || undefined} />
              </Field>
              <Field label="CECO" htmlFor="ceco" error={err("ceco")}>
                <Input id="ceco" inputMode="numeric" className="font-mono" {...register("ceco")} aria-invalid={Boolean(err("ceco")) || undefined} />
              </Field>
            </div>
          </section>

          {/* 02 · Petición */}
          <section id={BLOCKS[1].anchor} className="grid scroll-mt-24 gap-6">
            <SectionHeading index="02" title="Petición" />
            <div className="grid gap-5">
              <Field label="Concepto" htmlFor="concept" error={err("concept")} hint="Ej.: Envío de pruebas de imprenta">
                <Input id="concept" {...register("concept")} aria-invalid={Boolean(err("concept")) || undefined} />
              </Field>
              <Field label="Descripción del envío" htmlFor="description" error={err("description")} hint="Qué se envía, contenido, peso estimado o instrucciones especiales.">
                <Textarea id="description" rows={4} {...register("description")} aria-invalid={Boolean(err("description")) || undefined} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-[1fr_10rem] sm:items-start">
                <ChoiceGroup
                  legend="Tipo de envío"
                  name="shipment_type"
                  options={shipmentTypeOptions}
                  registration={register("shipment_type")}
                  error={err("shipment_type")}
                />
                {values.shipment_type === "caja" ? (
                  <Field label="Nº de cajas" htmlFor="box_count" error={err("box_count")}>
                    <Input id="box_count" type="number" min={1} max={999} inputMode="numeric" className="font-mono" {...register("box_count")} aria-invalid={Boolean(err("box_count")) || undefined} />
                  </Field>
                ) : null}
              </div>
            </div>
          </section>

          {/* 03 · Destino */}
          <section
            id={BLOCKS[2].anchor}
            className={cn(
              "-mx-3 grid scroll-mt-24 gap-6 rounded-xl px-3 py-3 ring-1 transition-shadow duration-300",
              labelHover ? "ring-accent/40" : "ring-transparent",
            )}
          >
            <SectionHeading index="03" title="Destino" />
            {!readOnly ? <RecipientCombobox onSelect={selectRecipient} /> : null}
            {values.recipient_id ? (
              <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                Destino de la libreta.
                {!readOnly ? (
                  <button type="button" onClick={clearRecipient} className="inline-flex items-center gap-1 underline-offset-4 hover:text-ink hover:underline">
                    <X className="size-3.5" /> Desvincular (guardar como nuevo)
                  </button>
                ) : null}
              </p>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-6">
              <Field label="Empresa de destino" htmlFor="dest_company" error={err("dest_company")} className="sm:col-span-6">
                <Input id="dest_company" autoComplete="off" {...register("dest_company")} aria-invalid={Boolean(err("dest_company")) || undefined} />
              </Field>
              <Field label="Dirección" htmlFor="dest_address" error={err("dest_address")} className="sm:col-span-6">
                <Input id="dest_address" autoComplete="off" {...register("dest_address")} aria-invalid={Boolean(err("dest_address")) || undefined} />
              </Field>
              <Field label="Código postal" htmlFor="dest_postal_code" error={err("dest_postal_code")} className="sm:col-span-2">
                <Input id="dest_postal_code" inputMode="numeric" className="font-mono" {...register("dest_postal_code", { onBlur: onPostalCodeBlur })} aria-invalid={Boolean(err("dest_postal_code")) || undefined} />
              </Field>
              <Field label="Ciudad" htmlFor="dest_city" error={err("dest_city")} className="sm:col-span-4">
                <Input id="dest_city" {...register("dest_city")} aria-invalid={Boolean(err("dest_city")) || undefined} />
              </Field>
              <Field label="Provincia" htmlFor="dest_province" error={err("dest_province")} className="sm:col-span-3">
                <Input id="dest_province" {...register("dest_province")} aria-invalid={Boolean(err("dest_province")) || undefined} />
              </Field>
              <Field label="País" htmlFor="dest_country" error={err("dest_country")} className="sm:col-span-3">
                <Input id="dest_country" {...register("dest_country")} aria-invalid={Boolean(err("dest_country")) || undefined} />
              </Field>
              <Field label="Persona de contacto" htmlFor="dest_contact" error={err("dest_contact")} className="sm:col-span-3">
                <Input id="dest_contact" {...register("dest_contact")} aria-invalid={Boolean(err("dest_contact")) || undefined} />
              </Field>
              <Field label="Teléfono de contacto" htmlFor="dest_phone" error={err("dest_phone")} className="sm:col-span-3">
                <Input id="dest_phone" type="tel" className="font-mono" {...register("dest_phone")} aria-invalid={Boolean(err("dest_phone")) || undefined} />
              </Field>
              <label className="flex items-center gap-3 text-sm sm:col-span-6">
                <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register("save_recipient")} />
                {values.recipient_id ? "Actualizar en la libreta de direcciones" : "Guardar en la libreta de direcciones"}
              </label>
            </div>
          </section>

          {/* 04 · Servicio */}
          <section id={BLOCKS[3].anchor} className="grid scroll-mt-24 gap-6">
            <SectionHeading index="04" title="Servicio" />
            {suggestions.length && !readOnly ? (
              <ul className="grid gap-2">
                {suggestions.map((s) => (
                  <li key={s.field} className="flex flex-wrap items-center gap-3 rounded-md border border-accent/30 bg-accent/5 px-3.5 py-2.5 text-sm">
                    <Sparkles className="size-4 text-accent" aria-hidden />
                    <span>
                      Sugerencia: <strong>{s.field === "scope" ? SCOPE_EMAIL[s.value as keyof typeof SCOPE_EMAIL] : TRANSPORT_EMAIL[s.value as keyof typeof TRANSPORT_EMAIL]}</strong>
                      <span className="text-muted"> · {s.reason}</span>
                    </span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setValue(s.field, s.value, { shouldDirty: true, shouldValidate: formState.isSubmitted })}
                    >
                      Aplicar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-3">
              <ChoiceGroup legend="Urgencia (plazo)" name="urgency" options={urgencyOptions} registration={register("urgency")} error={err("urgency")} />
              <ChoiceGroup legend="Ámbito geográfico" name="scope" options={scopeOptions} registration={register("scope")} error={err("scope")} />
              <ChoiceGroup legend="Tipo de transporte" name="transport" options={transportOptions} registration={register("transport")} error={err("transport")} />
            </div>
            <Field label="CC" htmlFor="email_cc" error={err("email_cc")} hint="Separa varios emails con comas. Para: siempre la mensajería.">
              <Input id="email_cc" className="font-mono" {...register("email_cc")} aria-invalid={Boolean(err("email_cc")) || undefined} />
            </Field>
          </section>
        </fieldset>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:mx-0 lg:rounded-xl lg:border lg:px-4">
          {!readOnly ? (
            <>
              <Button type="submit" aria-keyshortcuts="Control+Enter">
                <Mail /> {sent ? "Abrir de nuevo en Gmail" : "Abrir en Gmail"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void persist(false).then((ok) => ok && toast.success("Borrador guardado."))}>
                <Save /> Guardar
              </Button>
            </>
          ) : null}
          <Button type="button" variant="ghost" onClick={copyText}>
            <ClipboardCopy /> Copiar texto
          </Button>
          <Button type="button" variant="ghost" onClick={copyHtml}>
            <Table2 /> Copiar como tabla
          </Button>
          {!readOnly ? (
            <Button type="button" variant="ghost" onClick={() => void saveAsTemplate()}>
              <Bookmark /> Guardar como plantilla
            </Button>
          ) : null}
          {!readOnly ? <span className="ml-auto hidden font-mono text-xs text-muted xl:inline">Ctrl + Enter</span> : null}
        </div>
      </form>

      <aside className="grid gap-6 self-start lg:sticky lg:top-24" aria-label="Progreso y vista previa">
        <ProgressSteps progress={progress} sent={sent} />
        <div className="grid gap-3">
          <div role="tablist" aria-label="Vista lateral" className="flex gap-1 rounded-lg bg-line/50 p-1 text-sm">
            {(["paquete", "correo"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`panel-${key}`}
                onClick={() => setTab(key)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 transition-colors",
                  tab === key ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
                )}
              >
                {key === "paquete" ? "Paquete" : "Correo"}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="panel-paquete" aria-labelledby="tab-paquete" hidden={tab !== "paquete"}>
            {tab === "paquete" ? (
              <PackageStage
                stage={sent ? 5 : progress.stage}
                variant={variant}
                onPart={goToBlock}
                onLabelHover={setLabelHover}
                className="mx-auto max-w-md rounded-xl border border-line bg-surface p-3"
              />
            ) : null}
          </div>
          <div role="tabpanel" id="panel-correo" aria-labelledby="tab-correo" hidden={tab !== "correo"}>
            <EmailPreview to={settings.courier_to} cc={cc} subject={subject} body={body} />
          </div>
        </div>
      </aside>
    </div>
  );
}

const DEST_FIELDS = [
  "recipient_id",
  "dest_company",
  "dest_address",
  "dest_postal_code",
  "dest_city",
  "dest_province",
  "dest_country",
  "dest_contact",
  "dest_phone",
  "save_recipient",
] as const;

// Campos de cada bloque, en orden de pantalla (para enfocar el primer error).
const BLOCK_FIELDS = {
  requester: { request_date: 1, requester_name: 1, requester_phone: 1, requester_email: 1, company: 1, ceco: 1 },
  petition: { concept: 1, description: 1, shipment_type: 1, box_count: 1 },
  destination: { dest_company: 1, dest_address: 1, dest_postal_code: 1, dest_city: 1, dest_province: 1, dest_country: 1, dest_contact: 1, dest_phone: 1 },
  service: { urgency: 1, scope: 1, transport: 1, email_cc: 1 },
} as const;

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const content = {
    saving: [<LoaderCircle key="i" className="size-3.5 animate-spin" />, "Guardando…"],
    saved: [<Cloud key="i" className="size-3.5" />, "Guardado"],
    error: [<CloudOff key="i" className="size-3.5 text-urgent" />, "Sin guardar"],
  }[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
      {content}
      {state === "saved" ? <Check className="size-3 text-success" aria-hidden /> : null}
    </span>
  );
}
