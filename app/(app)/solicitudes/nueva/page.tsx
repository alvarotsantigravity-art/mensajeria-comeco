import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { listCarriers } from "@/lib/carriers/data";
import { emptyRequestValues, getRequest, getSettings, repeatValues, toEditorSettings, withOfficePickup } from "@/lib/requests/data";
import { withRecipient } from "@/lib/requests/prefill";
import { applyTemplate, getTemplatePayload, listTemplates } from "@/lib/requests/templates";
import { getRecipient } from "@/lib/recipients/data";
import type { RequestFormValues } from "@/lib/requests/schema";
import { RequestEditor } from "@/components/requests/request-editor";
import { EditorSkeleton } from "@/components/requests/editor-skeleton";
import { TemplateChips } from "@/components/requests/template-chips";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default function NewRequestPage({ searchParams }: PageProps<"/solicitudes/nueva">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewRequest searchParams={searchParams} />
    </Suspense>
  );
}

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);

async function NewRequest({ searchParams }: Pick<PageProps<"/solicitudes/nueva">, "searchParams">) {
  // requireUser primero: marca la ruta como dinámica antes de tocar Supabase.
  const profile = await requireUser();
  const [settings, params, carriers] = await Promise.all([getSettings(), searchParams, listCarriers()]);
  const incompleteProfile = !profile.full_name.trim() || !profile.phone;

  // Puntos de partida: repetir un envío, un destinatario de la libreta o una plantilla.
  const repeatId = param(params.repetir);
  const recipientId = param(params.destinatario);
  const templateId = param(params.plantilla);
  const [source, recipient, payload, templates] = await Promise.all([
    repeatId ? getRequest(repeatId) : null,
    recipientId ? getRecipient(recipientId) : null,
    templateId ? getTemplatePayload(templateId) : null,
    listTemplates(),
  ]);

  // ?proveedor=<slug> elige el proveedor de partida (por defecto, la mensajería interna).
  const chosen = carriers.find((c) => c.active && c.slug === param(params.proveedor)) ?? carriers.find((c) => c.slug === "mensajeria");
  let values: RequestFormValues = source ? repeatValues(source, profile, settings) : emptyRequestValues(profile, settings, chosen);
  if (payload) values = applyTemplate(values, payload);
  if (recipient) values = withRecipient(values, recipient);
  // Una plantilla antigua puede traer la recogida vacía: siempre Comeco por defecto.
  values = withOfficePickup(values, settings);
  const startedFrom = source ? `Repitiendo ${source.ref}` : null;

  return (
    <div className="grid gap-8">
      {incompleteProfile ? (
        <Alert>
          Tu perfil está incompleto.{" "}
          <Link href="/perfil" className="font-medium underline underline-offset-4">
            Complétalo
          </Link>{" "}
          y tus datos se rellenarán solos en cada solicitud.
        </Alert>
      ) : null}
      {startedFrom ? (
        <Alert>
          {startedFrom} con la fecha de hoy. Revisa los datos y ábrela en Gmail.
        </Alert>
      ) : null}
      {templates.length ? (
        <TemplateChips
          templates={templates}
          activeId={payload ? templateId : null}
          currentUserId={profile.id}
          isAdmin={profile.role === "admin"}
        />
      ) : null}
      <RequestEditor
        // Cambiar de punto de partida reinicia el formulario.
        key={`${repeatId}-${recipientId}-${templateId}-${param(params.proveedor)}`}
        initialId={null}
        initialRef={null}
        initialStatus="borrador"
        initialValues={values}
        settings={toEditorSettings(settings)}
        carriers={carriers}
        gmailAccount={profile.email}
        openSearch={params.buscar === "1"}
      />
    </div>
  );
}
