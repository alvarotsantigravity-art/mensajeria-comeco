// Opciones de la tabla "Prioridad, alcance y tipo de servicio" (§3).
// El orden y los textos son los del correo; no cambiarlos sin revisar la plantilla.

export const URGENCIES = ["urgente", "estandar", "economico"] as const;
export const SCOPES = ["local", "nacional", "internacional"] as const;
export const TRANSPORTS = ["moto", "furgoneta", "camion"] as const;
export const SHIPMENT_TYPES = ["documentacion", "caja"] as const;
export const STATUSES = ["borrador", "enviada", "entregada", "cancelada"] as const;

export type Urgency = (typeof URGENCIES)[number];
export type Scope = (typeof SCOPES)[number];
export type Transport = (typeof TRANSPORTS)[number];
export type ShipmentType = (typeof SHIPMENT_TYPES)[number];
export type Status = (typeof STATUSES)[number];

/** Texto tal cual aparece en el correo. */
export const URGENCY_EMAIL: Record<Urgency, string> = {
  urgente: "Urgente (menos de 4 horas)",
  estandar: "Estándar (en el día)",
  economico: "Económico (día siguiente)",
};
export const SCOPE_EMAIL: Record<Scope, string> = {
  local: "Local/Urbano",
  nacional: "Nacional",
  internacional: "Internacional",
};
export const TRANSPORT_EMAIL: Record<Transport, string> = {
  moto: "Moto",
  furgoneta: "Furgoneta",
  camion: "Camión",
};
export const SHIPMENT_TYPE_EMAIL: Record<ShipmentType, string> = {
  documentacion: "Documentación",
  caja: "Caja",
};

/** Etiqueta corta para el asunto y la interfaz. */
export const URGENCY_SHORT: Record<Urgency, string> = {
  urgente: "Urgente",
  estandar: "Estándar",
  economico: "Económico",
};

export const STATUS_LABEL: Record<Status, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};
