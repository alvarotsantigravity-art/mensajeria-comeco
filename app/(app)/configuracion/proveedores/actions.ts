"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_LAYOUTS, FORM_KINDS, OWN_DOMAIN } from "@/lib/carriers/types";

export type CarrierFormState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> };

const emailList = (min: number) =>
  z
    .string()
    .transform((v) =>
      v
        .split(/[,;\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.email("Hay un email no válido."))
        .min(min, "Indica al menos un email.")
        .max(20, "Demasiados emails.")
        .refine((list) => !list.some((e) => OWN_DOMAIN.test(e)), "No incluyas correos @comecografico.com."),
    );

const carrierSchema = z
  .object({
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,30}$/, "Solo minúsculas, números y guiones (2–30)."),
    name: z.string().trim().min(1, "Indica el nombre.").max(60),
    form_kind: z.enum(FORM_KINDS),
    email_layout: z.enum(EMAIL_LAYOUTS),
    ref_prefix: z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}$/, "De 2 a 5 letras mayúsculas."),
    email_to: emailList(1).pipe(z.array(z.string()).max(10, "Máximo 10 en Para.")),
    email_cc: emailList(0),
    subject_template: z.string().trim().min(1, "Indica el asunto.").max(300),
    email_intro: z.string().trim().max(300),
    greeting_name: z.string().trim().max(60),
    customer_code: z.string().trim().max(30),
    service_options: z
      .string()
      .transform((v) =>
        v
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.string().max(80)).max(10, "Máximo 10 tipos de servicio.")),
    uses_codes: z.boolean(),
    active: z.boolean(),
    sort_order: z.coerce.number().int().min(0).max(999).catch(0),
  })
  .superRefine((v, ctx) => {
    // El formulario de mensajería solo sabe generar su propia plantilla, y al revés.
    if ((v.form_kind === "mensajeria") !== (v.email_layout === "mensajeria")) {
      ctx.addIssue({ code: "custom", path: ["email_layout"], message: "La plantilla de mensajería va solo con el formulario de mensajería." });
    }
  });

const PATH = "/configuracion/proveedores";

/** Alta (mode=create) o edición de un proveedor. El slug no cambia una vez creado. */
export async function saveCarrier(_prev: CarrierFormState, formData: FormData): Promise<CarrierFormState> {
  await requireAdmin();
  const mode = formData.get("mode") === "create" ? "create" : "update";
  const raw = Object.fromEntries(formData);
  const parsed = carrierSchema.safeParse({ ...raw, uses_codes: raw.uses_codes === "on", active: raw.active === "on" });
  if (!parsed.success) return { message: "Revisa los campos marcados.", errors: z.flattenError(parsed.error).fieldErrors };

  const { slug, ...fields } = parsed.data;
  const supabase = await createClient();
  const result =
    mode === "create"
      ? await supabase.from("carriers").insert({ slug, ...fields }).select("slug").maybeSingle()
      : await supabase.from("carriers").update(fields).eq("slug", slug).select("slug").maybeSingle();

  if (result.error) {
    if (result.error.code === "23505") {
      return { message: "Ya existe un proveedor con ese identificador o prefijo.", errors: { ref_prefix: ["Prefijo o identificador repetido."] } };
    }
    console.error("saveCarrier", result.error.message);
    return { message: "No se pudo guardar el proveedor." };
  }
  if (!result.data) return { message: "No tienes permiso para cambiar proveedores." };

  revalidatePath(PATH);
  revalidatePath("/solicitudes/nueva");
  return { ok: true, message: mode === "create" ? `Proveedor ${fields.name} creado.` : `${fields.name} guardado.` };
}
