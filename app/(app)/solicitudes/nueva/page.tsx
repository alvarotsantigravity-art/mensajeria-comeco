import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { emptyRequestValues, getSettings, toEditorSettings } from "@/lib/requests/data";
import { RequestEditor } from "@/components/requests/request-editor";
import { EditorSkeleton } from "@/components/requests/editor-skeleton";
import { Alert } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Nueva solicitud" };

export default function NewRequestPage() {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <NewRequest />
    </Suspense>
  );
}

async function NewRequest() {
  // requireUser primero: marca la ruta como dinámica antes de tocar Supabase.
  const profile = await requireUser();
  const settings = await getSettings();
  const incompleteProfile = !profile.full_name.trim() || !profile.phone;

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
      <RequestEditor
        initialId={null}
        initialRef={null}
        initialStatus="borrador"
        initialValues={emptyRequestValues(profile, settings)}
        settings={toEditorSettings(settings)}
        gmailAccount={profile.email}
      />
    </div>
  );
}
