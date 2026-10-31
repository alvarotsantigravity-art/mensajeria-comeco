import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Introduce un email válido.")),
  password: z.string().min(1, "Introduce tu contraseña."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(10, "Mínimo 10 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Escribe tu nombre y apellidos."),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidPhoneNumber(v, "ES"), "Teléfono no válido."),
  company: z.string().trim().min(2, "Indica la sociedad o empresa."),
  default_ceco: z.string().trim().regex(/^\d{6,12}$/, "El CECO son solo dígitos (6–12)."),
});

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Introduce un email válido.")),
  full_name: z.string().trim().min(2, "Escribe el nombre."),
});

export type FormState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Shown once to the admin after creating a user or resetting a password. */
  tempPassword?: string;
};
