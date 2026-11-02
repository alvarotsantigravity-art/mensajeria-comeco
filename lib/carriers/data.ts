import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toCarrier, type Carrier } from "./types";

/** Todos los proveedores (activos e inactivos), en el orden configurado. */
export const listCarriers = cache(async (): Promise<Carrier[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("carriers").select("*").order("sort_order").order("name");
  if (error) throw new Error("No se pudieron cargar los proveedores.");
  return (data ?? []).map(toCarrier);
});

export async function getCarrier(slug: string): Promise<Carrier | null> {
  return (await listCarriers()).find((c) => c.slug === slug) ?? null;
}
