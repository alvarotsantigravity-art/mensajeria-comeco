import type { Metadata } from "next";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import { getSettings } from "@/lib/requests/data";
import { SectionHeading, Skeleton } from "@/components/ui/misc";
import { ConfigNav } from "../config-nav";
import { LegalForm } from "./legal-form";

export const metadata: Metadata = { title: "Albarán" };

export default function DeliveryNoteSettingsPage() {
  return (
    <div className="grid gap-10">
      <SectionHeading
        index="Configuración"
        title="Albarán"
        description="Datos legales que salen en la cabecera y en el pie de todos los albaranes (sin logotipo)."
      />
      <ConfigNav current="/configuracion/albaran" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Legal />
      </Suspense>
    </div>
  );
}

async function Legal() {
  await requireAdmin();
  const s = await getSettings();
  return (
    <LegalForm
      data={{
        legal_name: s.legal_name,
        legal_address: s.legal_address,
        legal_tax_id: s.legal_tax_id,
        delivery_note_waste: s.delivery_note_waste,
        delivery_note_legal: s.delivery_note_legal,
      }}
    />
  );
}
