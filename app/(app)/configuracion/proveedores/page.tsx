import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import { listCarriers } from "@/lib/carriers/data";
import { SUBJECT_PLACEHOLDERS } from "@/lib/email/build-body";
import { Badge, Card, SectionHeading, Skeleton } from "@/components/ui/misc";
import { ConfigNav } from "../config-nav";
import { CarrierForm } from "./carrier-form";

export const metadata: Metadata = { title: "Proveedores" };

export default function CarriersPage() {
  return (
    <div className="grid gap-10">
      <SectionHeading
        index="Configuración"
        title="Proveedores"
        description="Cada proveedor de transporte tiene su formulario, sus correos (Para, CC y asunto) y su prefijo de referencia. Los cambios valen para las solicitudes nuevas."
      />
      <ConfigNav current="/configuracion/proveedores" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Carriers />
      </Suspense>
    </div>
  );
}

async function Carriers() {
  await requireAdmin();
  const carriers = await listCarriers();

  return (
    <div className="grid gap-6">
      {carriers.map((carrier) => (
        <Card key={carrier.slug} className="grid gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{carrier.name}</h2>
            <Badge tone="neutral" className="font-mono">
              {carrier.refPrefix}-…
            </Badge>
            {carrier.active ? <Badge tone="success">Activo</Badge> : <Badge tone="urgent">Desactivado</Badge>}
          </div>
          <CarrierForm carrier={carrier} placeholders={SUBJECT_PLACEHOLDERS} />
        </Card>
      ))}
      <Card className="grid gap-5 border-dashed p-5 sm:p-6">
        <h2 className="text-xl font-semibold tracking-tight">Nuevo proveedor</h2>
        <CarrierForm placeholders={SUBJECT_PLACEHOLDERS} />
      </Card>
    </div>
  );
}
