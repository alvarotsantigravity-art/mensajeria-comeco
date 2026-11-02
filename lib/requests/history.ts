import "server-only";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, URGENCIES, type Status, type Urgency } from "./options";
import type { ShipmentRequestRow } from "./data";

// Historial de toda la oficina (§5.5): filtros compartidos por la tabla y el CSV.

export const HISTORY_PAGE_SIZE = 50;

export type HistoryFilters = {
  q: string;
  status: Status | null;
  urgency: Urgency | null;
  carrier: string | null;
  requester: string | null;
  recipient: string | null;
  from: string | null;
  to: string | null;
  page: number;
};

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseHistoryFilters(params: Record<string, string | string[] | undefined>): HistoryFilters {
  const status = one(params.estado);
  const urgency = one(params.urgencia);
  const carrier = one(params.proveedor);
  const page = Number.parseInt(one(params.pagina) ?? "1", 10);
  return {
    q: (one(params.q) ?? "").trim().slice(0, 100),
    status: STATUSES.includes(status as Status) ? (status as Status) : null,
    urgency: URGENCIES.includes(urgency as Urgency) ? (urgency as Urgency) : null,
    carrier: carrier && /^[a-z0-9-]{2,30}$/.test(carrier) ? carrier : null,
    requester: isUuid(one(params.solicitante)) ? one(params.solicitante)! : null,
    recipient: isUuid(one(params.destinatario)) ? one(params.destinatario)! : null,
    from: isDate(one(params.desde)) ? one(params.desde)! : null,
    to: isDate(one(params.hasta)) ? one(params.hasta)! : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export type HistoryRow = Pick<
  ShipmentRequestRow,
  | "id"
  | "ref"
  | "request_date"
  | "requester_id"
  | "requester_name"
  | "concept"
  | "dest_company"
  | "dest_city"
  | "urgency"
  | "scope"
  | "transport"
  | "shipment_type"
  | "box_count"
  | "status"
  | "sent_at"
  | "carrier"
  | "op"
  | "product"
>;

const LIST_COLUMNS =
  "id, ref, request_date, requester_id, requester_name, concept, dest_company, dest_city, urgency, scope, transport, shipment_type, box_count, status, sent_at, carrier, op, product";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Consulta filtrada (sin ejecutar); `columns` permite pedir más campos para el CSV. */
function historyQuery(supabase: Supabase, filters: HistoryFilters, columns: string) {
  let query = supabase.from("shipment_requests").select(columns, { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.urgency) query = query.eq("urgency", filters.urgency);
  if (filters.carrier) query = query.eq("carrier", filters.carrier);
  if (filters.requester) query = query.eq("requester_id", filters.requester);
  if (filters.recipient) query = query.eq("recipient_id", filters.recipient);
  if (filters.from) query = query.gte("request_date", filters.from);
  if (filters.to) query = query.lte("request_date", filters.to);
  if (filters.q) {
    // Sin caracteres que rompan la sintaxis de or() de PostgREST.
    const term = filters.q.replace(/[,()*%\\]/g, " ").trim();
    if (term) {
      query = query.or(
        ["ref", "dest_company", "dest_city", "concept", "requester_name", "dest_contact", "op", "product", "pickup_company"]
          .map((column) => `${column}.ilike.*${term}*`)
          .join(","),
      );
    }
  }
  return query.order("request_date", { ascending: false }).order("created_at", { ascending: false });
}

export async function listHistory(filters: HistoryFilters): Promise<{ rows: HistoryRow[]; total: number }> {
  const start = (filters.page - 1) * HISTORY_PAGE_SIZE;
  const { data, count, error } = await historyQuery(await createClient(), filters, LIST_COLUMNS).range(start, start + HISTORY_PAGE_SIZE - 1);
  if (error) console.error("listHistory", error.message);
  return { rows: (data ?? []) as unknown as HistoryRow[], total: count ?? 0 };
}

/** Todas las filas filtradas para exportar (tope de seguridad: 5000). */
export async function exportHistory(filters: HistoryFilters): Promise<ShipmentRequestRow[]> {
  const { data, error } = await historyQuery(await createClient(), filters, "*").range(0, 4999);
  if (error) console.error("exportHistory", error.message);
  return (data ?? []) as unknown as ShipmentRequestRow[];
}

export async function listRequesters(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
  return (data ?? []).filter((p) => p.full_name.trim());
}
