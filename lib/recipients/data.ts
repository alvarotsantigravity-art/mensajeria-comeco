import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { RecipientFormValues } from "./schema";

export type RecipientRow = Database["public"]["Tables"]["recipients"]["Row"];

/** Búsqueda tolerante a tildes (search_recipients); sin texto: favoritos y recientes. */
export async function searchRecipients(q: string, limit = 50, favoritesOnly = false): Promise<RecipientRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("search_recipients", { q: q.trim(), max_results: favoritesOnly ? 50 : limit });
  const rows = data ?? [];
  return favoritesOnly ? rows.filter((r) => r.is_favorite) : rows;
}

export async function getRecipient(id: string): Promise<RecipientRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("recipients").select("*").eq("id", id).maybeSingle();
  return data;
}

export function recipientToValues(r: RecipientRow): RecipientFormValues {
  return {
    company_name: r.company_name,
    address: r.address ?? "",
    postal_code: r.postal_code ?? "",
    city: r.city ?? "",
    province: r.province ?? "",
    country: r.country,
    contact_person: r.contact_person ?? "",
    phone: r.phone ?? "",
    email: r.email ?? "",
    notes: r.notes ?? "",
    source_url: r.source_url ?? "",
    verified_at: r.verified_at ? r.verified_at.slice(0, 10) : "",
    is_favorite: r.is_favorite,
  };
}
