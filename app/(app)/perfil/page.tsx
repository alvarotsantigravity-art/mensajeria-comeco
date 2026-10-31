import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { Alert, SectionHeading, Skeleton } from "@/components/ui/misc";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Mi perfil" };

export default function ProfilePage({ searchParams }: PageProps<"/perfil">) {
  return (
    <div className="grid max-w-3xl gap-10">
      <SectionHeading
        index="Mi perfil"
        title="Tus datos de solicitante"
        description="Se rellenan solos en cada solicitud de mensajería. Puedes cambiarlos cuando quieras."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Profile({ searchParams }: Pick<PageProps<"/perfil">, "searchParams">) {
  const [profile, params] = await Promise.all([requireUser(), searchParams]);
  return (
    <div className="grid gap-6">
      {params.bienvenida ? (
        <Alert>Contraseña guardada. Completa tu perfil para empezar.</Alert>
      ) : null}
      <ProfileForm profile={profile} />
    </div>
  );
}
