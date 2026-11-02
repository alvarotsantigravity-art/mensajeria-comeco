import type { Database } from "@/lib/supabase/database.types";

// Proveedores de transporte (tabla carriers). Seguro en cliente: sin datos sensibles.

export type CarrierRow = Database["public"]["Tables"]["carriers"]["Row"];

export const FORM_KINDS = ["mensajeria", "transporte"] as const;
export const EMAIL_LAYOUTS = ["mensajeria", "tabla", "lista"] as const;
export type FormKind = (typeof FORM_KINDS)[number];
export type EmailLayout = (typeof EMAIL_LAYOUTS)[number];

export const FORM_KIND_LABEL: Record<FormKind, string> = {
  mensajeria: "Mensajería (urgencia, ámbito, bultos)",
  transporte: "Transporte (recogida, entrega, palés)",
};
export const EMAIL_LAYOUT_LABEL: Record<EmailLayout, string> = {
  mensajeria: "Plantilla de mensajería",
  tabla: "Tabla de transporte (BOYACA, TIPSA)",
  lista: "Lista corta (RAFA VENTO)",
};

export type Carrier = {
  slug: string;
  name: string;
  formKind: FormKind;
  emailLayout: EmailLayout;
  refPrefix: string;
  emailTo: string[];
  emailCc: string[];
  subjectTemplate: string;
  emailIntro: string;
  greetingName: string;
  customerCode: string;
  serviceOptions: string[];
  usesCodes: boolean;
  active: boolean;
  sortOrder: number;
};

export const DEFAULT_CARRIER = "mensajeria";

export function toCarrier(row: CarrierRow): Carrier {
  return {
    slug: row.slug,
    name: row.name,
    formKind: (FORM_KINDS as readonly string[]).includes(row.form_kind) ? (row.form_kind as FormKind) : "transporte",
    emailLayout: (EMAIL_LAYOUTS as readonly string[]).includes(row.email_layout) ? (row.email_layout as EmailLayout) : "tabla",
    refPrefix: row.ref_prefix,
    emailTo: row.email_to,
    emailCc: row.email_cc,
    subjectTemplate: row.subject_template,
    emailIntro: row.email_intro,
    greetingName: row.greeting_name,
    customerCode: row.customer_code,
    serviceOptions: row.service_options,
    usesCodes: row.uses_codes,
    active: row.active,
    sortOrder: row.sort_order,
  };
}

/** Correos que nunca van en Para/CC de un proveedor: los nuestros. */
export const OWN_DOMAIN = /@comecografico\.com$/i;
