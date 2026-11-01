import type { Scope, Transport } from "./options";
import { isSpain, normalizeText, provinceFromPostalCode } from "./provinces";
import type { RequestFormValues } from "./schema";

// Sugerencias no bloqueantes (§3): se muestran como chips con "Aplicar".

export type Suggestion =
  | { field: "scope"; value: Scope; reason: string }
  | { field: "transport"; value: Transport; reason: string };

type Input = Pick<
  RequestFormValues,
  "dest_country" | "dest_province" | "dest_postal_code" | "scope" | "transport" | "shipment_type" | "box_count"
>;

export function getSuggestions(v: Input, officeProvince: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const province = v.dest_province.trim() || provinceFromPostalCode(v.dest_postal_code) || "";

  if (!isSpain(v.dest_country)) {
    if (v.scope !== "internacional") {
      suggestions.push({ field: "scope", value: "internacional", reason: "El destino está fuera de España." });
    }
  } else if (province && normalizeText(province) === normalizeText(officeProvince)) {
    if (v.scope !== "local") {
      suggestions.push({ field: "scope", value: "local", reason: `Destino en la provincia de ${officeProvince}.` });
    }
  } else if (province && v.scope !== "nacional") {
    suggestions.push({ field: "scope", value: "nacional", reason: `Destino en ${province}.` });
  }

  const boxes = Number.parseInt(v.box_count, 10);
  if (v.shipment_type === "caja" && boxes >= 5 && v.transport !== "furgoneta" && v.transport !== "camion") {
    suggestions.push({ field: "transport", value: "furgoneta", reason: `${boxes} cajas no caben en una moto.` });
  }

  return suggestions;
}
