import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

// Ficha de la libreta (§5.5). En el formulario todo son strings; "" = vacío.

const text = (max = 200) => z.string().trim().max(max, `Máximo ${max} caracteres.`);

export const recipientSchema = z.object({
  company_name: text().min(1, "Indica la empresa."),
  address: text(),
  postal_code: text(12),
  city: text(),
  province: text(80),
  country: text(80).min(1, "Indica el país."),
  contact_person: text(),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidPhoneNumber(v, "ES"), "Teléfono no válido."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Email no válido."),
  notes: text(1000),
  source_url: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Debe empezar por http:// o https://"),
  verified_at: z.iso.date("Fecha no válida.").or(z.literal("")),
  is_favorite: z.boolean(),
});

export type RecipientFormValues = z.input<typeof recipientSchema>;

export const emptyRecipient: RecipientFormValues = {
  company_name: "",
  address: "",
  postal_code: "",
  city: "",
  province: "",
  country: "España",
  contact_person: "",
  phone: "",
  email: "",
  notes: "",
  source_url: "",
  verified_at: "",
  is_favorite: false,
};
