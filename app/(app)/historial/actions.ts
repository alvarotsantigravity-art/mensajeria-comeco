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
