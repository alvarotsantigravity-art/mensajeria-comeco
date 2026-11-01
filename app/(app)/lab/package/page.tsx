import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { SectionHeading, Skeleton } from "@/components/ui/misc";
import { PackageLab } from "./package-lab";

export const metadata: Metadata = { title: "Laboratorio · Paquete 3D" };

/** Sandbox de la escena 3D (§6.6): se valida aquí antes de integrarla en el formulario. */
export default function PackageLabPage() {
  return (
    <div className="grid gap-10">
      <SectionHeading
        index="Laboratorio"
        title="El paquete se prepara."
        description="Recorre las 5 etapas adelante y atrás y prueba las variantes. Arrastra la escena para girarla un poco."
      />
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <Lab />
      </Suspense>
    </div>
  );
}

async function Lab() {
  await requireUser();
  return <PackageLab />;
}
