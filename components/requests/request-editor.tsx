"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bookmark, Check, ClipboardCopy, Cloud, CloudOff, FileText, Globe, LoaderCircle, Mail, Printer, Save, Sparkles, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge, SectionHeading } from "@/components/ui/misc";
import { ChoiceGroup } from "@/components/requests/choice-group";
import { BLOCKS, ProgressSteps, TRANSPORT_TITLES } from "@/components/requests/progress-steps";
import { PackageStage, type PackageVariant } from "@/components/package/package-video";
import { RecipientCombobox } from "@/components/requests/recipient-combobox";
import { CompanySearchSheet } from "@/components/search/company-search-sheet";
import type { Candidate, CandidateField } from "@/lib/search/schema";
import { useShipmentProgress } from "@/hooks/use-shipment-progress";
import { composeEmail } from "@/lib/email/compose";
import { buildGmailUrl, GMAIL_URL_LIMIT } from "@/lib/email/gmail-url";
import { DEFAULT_CARRIER, type Carrier } from "@/lib/carriers/types";
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
import { parseEmailList, requestSchema, schemasFor, type RequestFormValues } from "@/lib/requests/schema";
import { getSuggestions } from "@/lib/requests/suggestions";
import { saveRequest } from "@/app/(app)/solicitudes/actions";
import { saveTemplate } from "@/app/(app)/solicitudes/template-actions";
import type { RecipientOption } from "@/app/(app)/libreta/actions";
import { withPickup, withRecipient } from "@/lib/requests/prefill";

type SaveState = "idle" | "saving" | "saved" | "error";

const AUTOSAVE_DELAY = 1200;

const urgencyOptions = URGENCIES.map((value) => ({ value, label: URGENCY_EMAIL[value] }));
const scopeOptions = SCOPES.map((value) => ({ value, label: SCOPE_EMAIL[value] }));
const transportOptions = TRANSPORTS.map((value) => ({ value, label: TRANSPORT_EMAIL[value] }));
const shipmentTypeOptions = [
  { value: "documentacion", label: SHIPMENT_TYPE_EMAIL.documentacion, hint: "Sobre o carpeta" },
  { value: "caja", label: SHIPMENT_TYPE_EMAIL.caja, hint: "Indica cuántas" },
];

const hasContent = (v: RequestFormValues) =>
  // La recogida no cuenta: sale rellena con la oficina y crearía borradores vacíos.
  Boolean(v.concept.trim() || v.description.trim() || v.dest_company.trim() || v.op.trim() || v.product.trim());

/** Sin proveedores cargados (no debería pasar), la mensajería de la configuración. */
function fallbackCarrier(settings: EditorSettings): Carrier {
  return {
    slug: DEFAULT_CARRIER,
    name: "Mensajería interna",
    formKind: "mensajeria",
    emailLayout: "mensajeria",
    refPrefix: "MSJ",
    emailTo: settings.courier_to,
    emailCc: settings.courier_cc,
    subjectTemplate: settings.subject_template,
    emailIntro: "",
    greetingName: "",
    customerCode: "",
    serviceOptions: [],
    usesCodes: false,
    active: true,
    sortOrder: 0,
  };
}

function findCarrier(carriers: Carrier[], slug: string, settings: EditorSettings): Carrier {
  return carriers.find((c) => c.slug === slug) ?? carriers.find((c) => c.slug === DEFAULT_CARRIER) ?? carriers[0] ?? fallbackCarrier(settings);
}

const sameList = (a: string[], b: string[]) => a.map((s) => s.toLowerCase()).join(",") === b.map((s) => s.toLowerCase()).join(",");

export function RequestEditor({
  initialId,
  initialRef,
  initialStatus,
  initialValues,
  settings,
  carriers,
  gmailAccount,
  readOnly = false,
  openSearch = false,
}: {
  initialId: string | null;
  initialRef: string | null;
  initialStatus: Status;
  initialValues: RequestFormValues;
  settings: EditorSettings;
  /** Proveedores de transporte (activos e inactivos: una solicitud antigua puede usar uno inactivo). */
  carriers: Carrier[];
  gmailAccount: string;
  readOnly?: boolean;
  /** Abre el buscador al entrar (acceso desde Inicio). */
  openSearch?: boolean;
}) {
  const router = useRouter();
  const form = useForm<RequestFormValues>({
    defaultValues: initialValues,
    // El esquema depende del proveedor elegido; transforma (minúsculas, tipos) y aquí solo se usan sus errores.
    resolver: (vals, ctx, opts) => {
      const c = findCarrier(carriers, vals.carrier, settings);
      const schema = schemasFor(c.formKind, c.serviceOptions).full as typeof requestSchema;
      return (zodResolver(schema) as unknown as Resolver<RequestFormValues>)(vals, ctx, opts);
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const { register, control, setValue, getValues, formState } = form;
  const values = useWatch({ control }) as RequestFormValues;
  const carrier = findCarrier(carriers, values.carrier, settings);
  const isTransport = carrier.formKind === "transporte";
  const schemas = schemasFor(carrier.formKind, carrier.serviceOptions);
  const progress = useShipmentProgress(values, schemas.blocks);
  const err = (name: keyof RequestFormValues) => formState.errors[name]?.message;

  const [ref, setRef] = useState(initialRef);
  const [status, setStatus] = useState<Status>(initialStatus);
  const [saveState, setSaveState] = useState<SaveState>(initialId ? "saved" : "idle");
  const idRef = useRef(initialId);
  const lastSaved = useRef(JSON.stringify(initialValues));
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const email = useMemo(() => composeEmail(values, carrier), [values, carrier]);
  const { subject, text: body } = email;
  const suggestions = isTransport ? [] : getSuggestions(values, settings.office_province);
  const sent = status !== "borrador";
  // En el selector: los activos y, si ya estaba elegido, uno desactivado.
  const carrierOptions = carriers
    .filter((c) => c.active || c.slug === values.carrier)
    .map((c) => ({ value: c.slug, label: c.name, hint: c.active ? `${c.refPrefix} · ${c.emailTo[0] ?? ""}` : "Desactivado" }));

  // Vídeo de la caja: avanza con los bloques completos y sale de escena al enviar. En transporte, una caja.
  const boxCount = isTransport ? 1 : Math.max(1, Number(values.box_count) || 1);
  const variant = useMemo<PackageVariant>(() => ({ boxCount }), [boxCount]);

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
    const first = FIELD_ORDER.find((name) => form.getFieldState(name).error);
    if (first) form.setFocus(first);
  }

  async function openInGmail() {
    const snapshot = getValues();
    const target = findCarrier(carriers, snapshot.carrier, settings);
    if (!target.active) {
      toast.error(`${target.name} está desactivado. Elige otro proveedor.`);
      return;
    }
    if (!schemasFor(target.formKind, target.serviceOptions).full.safeParse(snapshot).success) {
      await form.trigger();
      focusFirstError();
      toast.error("Faltan datos: revisa los campos marcados.");
      return;
    }

    const composed = composeEmail(snapshot, target);
    const message = {
      to: composed.to,
      cc: composed.cc,
      subject: composed.subject,
      authuser: gmailAccount,
    };
    const fullBody = composed.text;
    // El enlace de Gmail solo admite texto plano: para que el cuerpo salga como
    // tabla, se copia en HTML y Gmail se abre con Para/CC/Asunto y el cuerpo vacío.
    // La activación del clic dura unos segundos, así que el window.open sigue permitido.
    let url: string;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([composed.html], { type: "text/html" }),
          "text/plain": new Blob([fullBody], { type: "text/plain" }),
        }),
      ]);
      url = buildGmailUrl(message);
      toast.info("Correo copiado como tabla: en Gmail, pulsa Ctrl+V en el cuerpo.", { duration: 10000 });
    } catch {
      // Sin portapapeles HTML: el texto va en el enlace (o copiado, si es muy largo).
      url = buildGmailUrl({ ...message, body: fullBody });
      if (url.length > GMAIL_URL_LIMIT) {
        await navigator.clipboard.writeText(fullBody).catch(() => undefined);
        url = buildGmailUrl(message);
        toast.info("El correo es largo: lo he copiado. Pégalo en Gmail con Ctrl+V.");
      }
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
      const html = email.html;
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

  // Buscador de empresas (§5.3): botón en Destino (y en Recogida, en transporte) y Ctrl+K.
  // Rellena el bloque desde el que se abrió; Ctrl+K, la recogida si el foco está en ella.
  const [searchOpen, setSearchOpen] = useState(openSearch && !readOnly);
  const [searchTarget, setSearchTarget] = useState<SearchTarget>("destination");
  function openSearchFor(target: SearchTarget) {
    setSearchTarget(target);
    setSearchOpen(true);
  }
  useEffect(() => {
    if (readOnly) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        const focused = document.activeElement;
        const inPickup = focused?.id.startsWith("pickup_") || (isTransport && focused?.closest(`#${BLOCKS[1].anchor}`));
        setSearchTarget(inPickup ? "pickup" : "destination");
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readOnly, isTransport]);

  /** Rellena en cascada (40 ms) con un destello del acento (§6.5). */
  function fillFields(entries: [keyof RequestFormValues, string][]) {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    entries.forEach(([name, value], i) => {
      const apply = () => {
        setValue(name, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
        if (!reduced) {
          const el = document.getElementById(name);
          el?.classList.remove("animate-flash");
          void el?.offsetWidth;
          el?.classList.add("animate-flash");
        }
      };
      if (reduced) apply();
      else setTimeout(apply, i * 40);
    });
  }

  function applySearchCandidate(candidate: Candidate, companyName: string) {
    setSearchOpen(false);
    if (searchTarget === "pickup") {
      const entries: [keyof RequestFormValues, string][] = [["pickup_company", companyName]];
      for (const [field, name] of Object.entries(PICKUP_SEARCH_MAP) as [CandidateField, keyof RequestFormValues][]) {
        entries.push([name, candidate[field] ?? ""]);
      }
      // Origen nuevo: ya no es el de la libreta (ni su código).
      setValue("pickup_recipient_id", null, { shouldDirty: true });
      setValue("pickup_code", "", { shouldDirty: true });
      fillFields(entries);
      document.getElementById(BLOCKS[1].anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.success(`Recogida: ${companyName}. Verifica los datos antes de enviar.`);
      return;
    }
    const entries: [keyof RequestFormValues, string][] = [["dest_company", companyName]];
    for (const [field, name] of Object.entries(SEARCH_FIELD_MAP) as [CandidateField, DestField][]) {
      entries.push([name, candidate[field] ?? (name === "dest_country" ? getValues("dest_country") : "")]);
    }
    // Es un destino nuevo: se desvincula de la libreta y se propone guardarlo.
    setValue("recipient_id", null, { shouldDirty: true });
    setValue("save_recipient", true, { shouldDirty: true });
    fillFields(entries);
    document.getElementById(BLOCKS[2].anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    toast.success(`Destino: ${companyName}. Verifica los datos antes de enviar.`);
  }

  function applySearchField(field: CandidateField, value: string) {
    const name = searchTarget === "pickup" ? PICKUP_SEARCH_MAP[field] : SEARCH_FIELD_MAP[field];
    if (!name) return;
    fillFields([[name, value]]);
    toast.success(`Campo rellenado: ${value}`);
  }

  function clearRecipient() {
    setValue("recipient_id", null, { shouldDirty: true });
    setValue("save_recipient", true, { shouldDirty: true });
  }

  /** Transporte: el origen de la carga sale de la libreta (con su código, si el proveedor lo usa). */
  function selectPickup(option: RecipientOption) {
    const next = withPickup(getValues(), option);
    for (const name of PICKUP_FIELDS) {
      setValue(name, next[name], { shouldDirty: true, shouldValidate: formState.isSubmitted });
    }
    toast.success(`Recogida: ${option.company_name}`);
  }

  /**
   * Al cambiar de proveedor, el CC pasa a ser el del nuevo proveedor si no se había tocado.
   * Los errores del formulario anterior ya no aplican.
   */
  function onCarrierChange(slug: string) {
    const next = findCarrier(carriers, slug, settings);
    const currentCc = parseEmailList(getValues("email_cc"));
    // "Sin tocar" = vacío o igual al CC por defecto de algún proveedor.
    if (!currentCc.length || carriers.some((c) => sameList(currentCc, c.emailCc))) {
      setValue("email_cc", next.emailCc.join(", "), { shouldDirty: true });
    }
    form.clearErrors();
  }

  /** Etiquetas y albarán salen de la solicitud guardada: se guarda antes de ir. */
  async function goToPrint(page: "etiquetas" | "albaranes") {
    if (!readOnly) {
      if (!idRef.current && !getValues("dest_company").trim()) {
        toast.error(page === "etiquetas" ? "Rellena el destino antes de imprimir etiquetas." : "Rellena el destino antes de preparar el albarán.");
        return;
      }
      if (!(await persist(false))) return;
    }
    if (idRef.current) router.push(`/${page}?solicitud=${idRef.current}`);
  }

  async function saveAsTemplate() {
    const name = window.prompt(
      "Nombre de la plantilla (p. ej. «Documentación a notaría X»):",
      (isTransport ? [carrier.name, values.product].filter(Boolean).join(" · ") : values.concept) || values.dest_company,
    );
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

  function onPickupPostalCodeBlur() {
    const province = provinceFromPostalCode(getValues("pickup_postal_code"));
    if (province && !getValues("pickup_province").trim()) {
      setValue("pickup_province", province, { shouldDirty: true });
    }
  }

  /** Campo de texto de los bloques de transporte. */
  const textField = (
    name: keyof RequestFormValues,
    label: string,
    { className, type, hint, mono, inputMode, onBlur }: { className?: string; type?: string; hint?: string; mono?: boolean; inputMode?: "numeric" | "tel"; onBlur?: () => void } = {},
  ) => (
    <Field label={label} htmlFor={name} error={err(name)} hint={hint} className={className}>
      <Input
        id={name}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        className={mono ? "font-mono" : undefined}
        {...register(name, onBlur ? { onBlur } : undefined)}
        aria-invalid={Boolean(err(name)) || undefined}
      />
    </Field>
  );

  /** Recogida: la misma en todos los proveedores (libreta, buscador y campos). */
  const pickupBlock = (
    <>
      <h3 className="text-sm font-semibold tracking-tight">Recogida</h3>
      {!readOnly ? (
        <div className="grid gap-2">
          <RecipientCombobox onSelect={selectPickup} label="Origen de la libreta" />
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>¿No está en la libreta?</span>
            <Button type="button" size="sm" onClick={() => openSearchFor("pickup")}>
              <Globe /> Buscar empresa en internet
            </Button>
          </div>
        </div>
      ) : null}
      {values.pickup_recipient_id ? (
        <p className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          Origen de la libreta.
          {!readOnly ? (
            <button
              type="button"
              onClick={() => setValue("pickup_recipient_id", null, { shouldDirty: true })}
              className="inline-flex items-center gap-1 underline-offset-4 hover:text-ink hover:underline"
            >
              <X className="size-3.5" /> Desvincular
            </button>
          ) : null}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-6">
        {carrier.usesCodes ? textField("pickup_code", "Código de recogida", { className: "sm:col-span-2", mono: true, hint: "Rotomadrid: 178" }) : null}
        {textField("pickup_company", "Origen de la carga", { className: carrier.usesCodes ? "sm:col-span-4" : "sm:col-span-6" })}
        {textField("pickup_address", "Dirección", { className: "sm:col-span-6" })}
        {textField("pickup_postal_code", "Código postal", { className: "sm:col-span-2", mono: true, inputMode: "numeric", onBlur: onPickupPostalCodeBlur })}
        {textField("pickup_city", "Ciudad", { className: "sm:col-span-4" })}
        {textField("pickup_province", "Provincia", { className: "sm:col-span-2" })}
        {textField("pickup_contact", "Contacto", { className: "sm:col-span-2" })}
        {textField("pickup_phone", "Teléfono", { className: "sm:col-span-2", type: "tel", mono: true })}
        {textField("pickup_date", "Fecha de recogida", { className: "sm:col-span-3", type: "date", mono: true })}
        {textField("pickup_time", "Hora de recogida", { className: "sm:col-span-3", type: "time", mono: true, hint: "Opcional" })}
        {textField("pickup_notes", "Otros (recogida)", { className: "sm:col-span-6" })}
      </div>
    </>
  );

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
          {/* Proveedor: decide el formulario, los correos y el prefijo de la referencia. */}
          <section className="grid gap-4">
            <SectionHeading
              title="Proveedor de transporte"
              description={
                sent
                  ? "Ya enviada: el proveedor no se puede cambiar."
                  : "Cada proveedor tiene su formulario, sus correos y su prefijo de referencia."
              }
            />
            <fieldset disabled={sent} className="min-w-0">
              <ChoiceGroup
                legend="Proveedor"
                name="carrier"
                options={carrierOptions}
                registration={register("carrier", { onChange: (event) => onCarrierChange(event.target.value) })}
                error={err("carrier")}
                optionsClassName="sm:grid-cols-2"
              />
            </fieldset>
          </section>

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

          {/* 02 · Carga y recogida (transporte) */}
          {isTransport ? (
            <section id={BLOCKS[1].anchor} className="grid scroll-mt-24 gap-6">
              <SectionHeading index="02" title="Carga y recogida" />
              <div className="grid gap-5 sm:grid-cols-6">
                {textField("op", "OP", { className: "sm:col-span-2", mono: true, hint: "Ej.: OP2601850" })}
                {textField("product", "Producto", { className: "sm:col-span-4", hint: "Ej.: INTERIORES XL SEMANAL 2037" })}
                {textField("concept", "Referencia", { className: "sm:col-span-6", hint: "Opcional. Ej.: DIGITAL · MUESTRAS CAPRABO" })}
              </div>
              {pickupBlock}
            </section>
          ) : (
          /* 02 · Petición y recogida (mensajería) */
          <section id={BLOCKS[1].anchor} className="grid scroll-mt-24 gap-6">
            <SectionHeading index="02" title="Petición y recogida" />
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
            {pickupBlock}
          </section>
          )}

          {/* 03 · Destino (en transporte, Entrega) */}
          <section
            id={BLOCKS[2].anchor}
            className="grid scroll-mt-24 gap-6"
          >
            <SectionHeading index="03" title={isTransport ? "Entrega" : "Destino"} />
            {!readOnly ? (
              <div className="grid gap-2">
                <RecipientCombobox onSelect={selectRecipient} />
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span>¿No está en la libreta?</span>
                  {/* Lo más usado de la app: en azul, como «Abrir en Gmail». */}
                  <Button type="button" size="sm" onClick={() => openSearchFor("destination")}>
                    <Globe /> Buscar empresa en internet
                  </Button>
                  <kbd className="hidden font-mono text-xs sm:inline">Ctrl + K</kbd>
                </div>
              </div>
            ) : null}
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
              {isTransport && carrier.usesCodes
                ? textField("delivery_code", "Código de entrega", { className: "sm:col-span-2", mono: true, hint: "Lo da el proveedor para cada destino" })
                : null}
              <Field
                label={isTransport ? "Lugar de entrega" : "Empresa de destino"}
                htmlFor="dest_company"
                error={err("dest_company")}
                className={isTransport && carrier.usesCodes ? "sm:col-span-4" : "sm:col-span-6"}
              >
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
              {isTransport ? (
                <>
                  {textField("delivery_date", "Fecha de entrega", { className: "sm:col-span-3", type: "date", mono: true })}
                  {textField("delivery_time", "Hora de entrega", { className: "sm:col-span-3", type: "time", mono: true, hint: "Opcional" })}
                  {textField("delivery_notes", "Otros (entrega)", { className: "sm:col-span-6" })}
                </>
              ) : null}
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
            {isTransport ? (
              <div className="grid gap-5 sm:grid-cols-6">
                {carrier.serviceOptions.length ? (
                  <ChoiceGroup
                    legend={`Tipo de servicio ${carrier.name}`}
                    name="carrier_service"
                    options={carrier.serviceOptions.map((o) => ({ value: o, label: o }))}
                    registration={register("carrier_service")}
                    error={err("carrier_service")}
                    className="sm:col-span-6"
                    optionsClassName="sm:grid-cols-2"
                  />
                ) : null}
                {textField("pallets", "Nº de palés", { className: "sm:col-span-3", hint: "Ej.: 15 palets aprox" })}
                {textField("weight_kg", "Peso total (kg)", { className: "sm:col-span-3", hint: "Ej.: 24000kg" })}
                <Field label="Observaciones" htmlFor="observations" error={err("observations")} className="sm:col-span-6">
                  <Textarea id="observations" rows={3} {...register("observations")} aria-invalid={Boolean(err("observations")) || undefined} />
                </Field>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-3">
                <ChoiceGroup legend="Urgencia (plazo)" name="urgency" options={urgencyOptions} registration={register("urgency")} error={err("urgency")} />
                <ChoiceGroup legend="Ámbito geográfico" name="scope" options={scopeOptions} registration={register("scope")} error={err("scope")} />
                <ChoiceGroup legend="Tipo de transporte" name="transport" options={transportOptions} registration={register("transport")} error={err("transport")} />
              </div>
            )}
            <Field label="CC" htmlFor="email_cc" error={err("email_cc")} hint={`Separa varios emails con comas. Para: ${carrier.emailTo.join(", ")}.`}>
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
          <Button type="button" variant="ghost" onClick={() => void goToPrint("etiquetas")}>
            <Printer /> Imprimir etiquetas
          </Button>
          <Button type="button" variant="ghost" onClick={() => void goToPrint("albaranes")}>
            <FileText /> Imprimir albarán
          </Button>
          {!readOnly ? <span className="ml-auto hidden font-mono text-xs text-muted xl:inline">Ctrl + Enter</span> : null}
        </div>
      </form>

      <aside className="grid gap-6 self-start lg:sticky lg:top-24" aria-label="Progreso">
        <ProgressSteps progress={progress} sent={sent} titles={isTransport ? TRANSPORT_TITLES : undefined} />
        {/* Sin tarjeta ni pestañas: el vídeo de la caja se funde con el fondo de la app. */}
        <PackageStage stage={sent ? 5 : progress.stage} variant={variant} className="mx-auto w-full max-w-md" />
      </aside>

      {/* Fuera del <form>: los eventos del portal suben por el árbol de React. */}
      {!readOnly ? (
        <CompanySearchSheet
          open={searchOpen}
          onOpenChange={setSearchOpen}
          initialQuery={(searchTarget === "pickup" ? [values.pickup_company, values.pickup_city] : [values.dest_company, values.dest_city])
            .filter((s) => s?.trim())
            .join(" ")}
          onUse={applySearchCandidate}
          onUseField={applySearchField}
        />
      ) : null}
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
  "delivery_code",
  "save_recipient",
] as const;

const PICKUP_FIELDS = [
  "pickup_recipient_id",
  "pickup_code",
  "pickup_company",
  "pickup_address",
  "pickup_postal_code",
  "pickup_city",
  "pickup_province",
  "pickup_contact",
  "pickup_phone",
] as const;

type DestField =
  | "dest_company"
  | "dest_address"
  | "dest_postal_code"
  | "dest_city"
  | "dest_province"
  | "dest_country"
  | "dest_contact"
  | "dest_phone";

type SearchTarget = "destination" | "pickup";

/** Del resultado del buscador al bloque de recogida (transporte; sin país). */
const PICKUP_SEARCH_MAP: Partial<Record<CandidateField, keyof RequestFormValues>> = {
  address: "pickup_address",
  postalCode: "pickup_postal_code",
  city: "pickup_city",
  province: "pickup_province",
  contactPerson: "pickup_contact",
  phone: "pickup_phone",
};

/** Del resultado del buscador al bloque de destino (email y web no tienen hueco). */
const SEARCH_FIELD_MAP: Partial<Record<CandidateField, DestField>> = {
  address: "dest_address",
  postalCode: "dest_postal_code",
  city: "dest_city",
  province: "dest_province",
  country: "dest_country",
  contactPerson: "dest_contact",
  phone: "dest_phone",
};

// Campos en orden de pantalla, de los dos formularios (para enfocar el primer error).
const FIELD_ORDER: (keyof RequestFormValues)[] = [
  "carrier",
  "request_date", "requester_name", "requester_phone", "requester_email", "company", "ceco",
  "op", "product", "concept", "description", "shipment_type", "box_count",
  "pickup_code", "pickup_company", "pickup_address", "pickup_postal_code", "pickup_city", "pickup_province",
  "pickup_contact", "pickup_phone", "pickup_date", "pickup_time", "pickup_notes",
  "delivery_code", "dest_company", "dest_address", "dest_postal_code", "dest_city", "dest_province", "dest_country",
  "dest_contact", "dest_phone", "delivery_date", "delivery_time", "delivery_notes",
  "urgency", "scope", "transport", "carrier_service", "pallets", "weight_kg", "observations", "email_cc",
];

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
