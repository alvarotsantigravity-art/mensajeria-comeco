import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { Profile } from "@/lib/auth/dal";
import { DEFAULT_CARRIER, type Carrier } from "@/lib/carriers/types";
import { EMPTY_TRANSPORT_VALUES, type RequestFormValues } from "./schema";

export type ShipmentRequestRow = Database["public"]["Tables"]["shipment_requests"]["Row"];
export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

/** Lo que el formulario necesita de la configuración global. */
export type EditorSettings = Pick<
  AppSettings,
  "courier_to" | "courier_cc" | "subject_template" | "office_province" | "default_company" | "default_ceco"
>;

export const getSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_settings").select("*").eq("id", true).single();
  if (error || !data) throw new Error("No se pudo cargar la configuración.");
  return data;
});

export function toEditorSettings(s: AppSettings): EditorSettings {
  return {
    courier_to: s.courier_to,
    courier_cc: s.courier_cc,
    subject_template: s.subject_template,
    office_province: s.office_province,
    default_company: s.default_company,
    default_ceco: s.default_ceco,
  };
}

export function todayInMadrid(): string {
  // en-CA formatea como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
}

/**
 * Recogida por defecto: la oficina de Comeco (lo habitual), con fecha de hoy.
 * Solo rellena si viene vacía: una recogida elegida a mano o de la libreta se respeta.
 * Sirve para formularios nuevos, repeticiones, plantillas y borradores antiguos.
 */
export function withOfficePickup(values: RequestFormValues, settings: AppSettings): RequestFormValues {
  if (values.pickup_company.trim()) return values;
  return {
    ...values,
    pickup_recipient_id: null,
    pickup_company: settings.sender_name,
    pickup_address: settings.sender_address,
    pickup_postal_code: settings.sender_postal_code,
    pickup_city: settings.sender_city,
    pickup_province: settings.sender_province,
    pickup_phone: settings.sender_phone,
    pickup_date: values.pickup_date || todayInMadrid(),
  };
}

/** Formulario vacío. El CC sale del proveedor (por defecto, la mensajería interna). */
export function emptyRequestValues(profile: Profile, settings: AppSettings, carrier?: Carrier | null): RequestFormValues {
  return withOfficePickup(baseRequestValues(profile, settings, carrier), settings);
}

function baseRequestValues(profile: Profile, settings: AppSettings, carrier?: Carrier | null): RequestFormValues {
  return {
    ...EMPTY_TRANSPORT_VALUES,
    carrier: carrier?.slug ?? DEFAULT_CARRIER,
    request_date: todayInMadrid(),
    requester_name: profile.full_name,
    requester_phone: profile.phone ?? "",
    requester_email: profile.email,
    company: profile.company || settings.default_company,
    ceco: profile.default_ceco || settings.default_ceco,
    concept: "",
    description: "",
    shipment_type: "",
    box_count: "",
    dest_company: "",
    dest_address: "",
    dest_postal_code: "",
    dest_city: "",
    dest_province: "",
    dest_country: "España",
    dest_contact: "",
    dest_phone: "",
    urgency: "",
    scope: "",
    transport: "",
    recipient_id: null,
    email_cc: (carrier?.emailCc ?? settings.courier_cc).join(", "),
    save_recipient: true,
  };
}

export function rowToValues(row: ShipmentRequestRow): RequestFormValues {
  return {
    carrier: row.carrier,
    request_date: row.request_date,
    requester_name: row.requester_name,
    requester_phone: row.requester_phone ?? "",
    requester_email: row.requester_email ?? "",
    company: row.company,
    ceco: row.ceco,
    concept: row.concept ?? "",
    description: row.description ?? "",
    shipment_type: row.shipment_type ?? "",
    box_count: row.box_count?.toString() ?? "",
    dest_company: row.dest_company ?? "",
    dest_address: row.dest_address ?? "",
    dest_postal_code: row.dest_postal_code ?? "",
    dest_city: row.dest_city ?? "",
    dest_province: row.dest_province ?? "",
    dest_country: row.dest_country,
    dest_contact: row.dest_contact ?? "",
    dest_phone: row.dest_phone ?? "",
    urgency: row.urgency ?? "",
    scope: row.scope ?? "",
    transport: row.transport ?? "",
    recipient_id: row.recipient_id,
    email_cc: row.email_cc.join(", "),
    save_recipient: row.recipient_id === null,
    op: row.op ?? "",
    product: row.product ?? "",
    pickup_recipient_id: row.pickup_recipient_id,
    pickup_code: row.pickup_code ?? "",
    pickup_company: row.pickup_company ?? "",
    pickup_address: row.pickup_address ?? "",
    pickup_postal_code: row.pickup_postal_code ?? "",
    pickup_city: row.pickup_city ?? "",
    pickup_province: row.pickup_province ?? "",
    pickup_contact: row.pickup_contact ?? "",
    pickup_phone: row.pickup_phone ?? "",
    pickup_date: row.pickup_date ?? "",
    pickup_time: row.pickup_time ?? "",
    pickup_notes: row.pickup_notes ?? "",
    delivery_code: row.delivery_code ?? "",
    delivery_date: row.delivery_date ?? "",
    delivery_time: row.delivery_time ?? "",
    delivery_notes: row.delivery_notes ?? "",
    pallets: row.pallets ?? "",
    weight_kg: row.weight_kg ?? "",
    carrier_service: row.carrier_service ?? "",
    observations: row.observations ?? "",
  };
}

/** null si no existe (o RLS no deja verla). */
export async function getRequest(id: string): Promise<ShipmentRequestRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("shipment_requests").select("*").eq("id", id).maybeSingle();
  return data;
}

export type RecentRequest = Pick<
  ShipmentRequestRow,
  "id" | "ref" | "request_date" | "dest_company" | "dest_city" | "urgency" | "status" | "requester_name" | "created_at" | "carrier"
>;

export async function listRecentRequests(limit = 6): Promise<RecentRequest[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipment_requests")
    .select("id, ref, request_date, dest_company, dest_city, urgency, status, requester_name, created_at, carrier")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** "Repetir envío" (§5.5): mismos datos con la fecha de hoy y el solicitante actual. */
export function repeatValues(row: ShipmentRequestRow, profile: Profile, settings: AppSettings): RequestFormValues {
  const base = emptyRequestValues(profile, settings);
  return withOfficePickup({
    ...rowToValues(row),
    request_date: base.request_date,
    requester_name: base.requester_name,
    requester_phone: base.requester_phone,
    requester_email: base.requester_email,
    company: base.company,
    ceco: base.ceco,
    // Las fechas de recogida y entrega son de cada envío: recogida hoy, entrega por decidir.
    pickup_date: base.pickup_date,
    delivery_date: "",
  }, settings);
}
