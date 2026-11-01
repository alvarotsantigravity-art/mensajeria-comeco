"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL } from "@/lib/requests/options";

// Cambio manual de estado de una solicitud ya enviada: enviada → entregada / cancelada.
const inputSchema = z.object({
  id: z.uuid(),
  status: z.enum(["enviada", "entregada", "cancelada"]),
});

export async function setRequestStatus(id: string, status: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const parsed = inputSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, message: "Estado no válido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
    .neq("status", "borrador")
    .select("id");
  if (error) return { ok: false, message: "No se pudo cambiar el estado." };
  if (!data.length) return { ok: false, message: "Solo quien la creó o un administrador puede cambiarla." };

  revalidatePath("/historial");
  revalidatePath("/");
  return { ok: true, message: `Marcada como ${STATUS_LABEL[parsed.data.status].toLowerCase()}.` };
}

const idsSchema = z.array(z.uuid()).min(1).max(200);

/**
 * Borra las solicitudes seleccionadas. La RLS decide qué se puede borrar:
 * el admin, cualquiera; el resto, solo sus borradores. Lo demás se ignora y se avisa.
 */
export async function deleteRequests(ids: string[]): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const parsed = idsSchema.safeParse([...new Set(ids)]);
  if (!parsed.success) return { ok: false, message: "Selección no válida." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("shipment_requests").delete().in("id", parsed.data).select("ref");
  if (error) return { ok: false, message: "No se pudieron eliminar." };

  revalidatePath("/historial");
  revalidatePath("/");
  const deleted = data.length;
  const skipped = parsed.data.length - deleted;
  if (!deleted) return { ok: false, message: "No tienes permiso para eliminar esas solicitudes." };
  return {
    ok: true,
    message:
      `${deleted === 1 ? "Eliminada 1 solicitud" : `Eliminadas ${deleted} solicitudes`}.` +
      (skipped ? ` ${skipped} no se ${skipped === 1 ? "pudo" : "pudieron"} borrar (solo el admin borra las enviadas).` : ""),
  };
}
