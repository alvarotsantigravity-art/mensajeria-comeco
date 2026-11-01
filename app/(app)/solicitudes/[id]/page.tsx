import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { getRequest, getSettings, rowToValues, toEditorSettings } from "@/lib/requests/data";
import type { Status } from "@/lib/requests/options";
import { RequestEditor } from "@/components/requests/request-editor";
import { EditorSkeleton } from "@/components/requests/editor-skeleton";

export const metadata: Metadata = { title: "Solicitud" };

export default function RequestPage({ params }: PageProps<"/solicitudes/[id]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Request params={params} />
    </Suspense>
  );
}

async function Request({ params }: Pick<PageProps<"/solicitudes/[id]">, "params">) {
  const { id } = await params;
  // requireUser primero: marca la ruta como dinámica antes de tocar Supabase.
  const profile = await requireUser();
  const [settings, request] = await Promise.all([getSettings(), getRequest(id)]);
  if (!request) notFound();

  const editable = request.requester_id === profile.id || profile.role === "admin";

  return (
    <RequestEditor
      key={request.id}
      initialId={request.id}
      initialRef={request.ref}
      initialStatus={request.status as Status}
      initialValues={rowToValues(request)}
      settings={toEditorSettings(settings)}
      gmailAccount={profile.email}
      readOnly={!editable}
    />
  );
}
