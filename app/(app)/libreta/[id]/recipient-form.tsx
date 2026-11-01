"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { provinceFromPostalCode } from "@/lib/requests/provinces";
import { recipientSchema, type RecipientFormValues } from "@/lib/recipients/schema";
import { saveRecipient } from "../actions";

export function RecipientForm({ id, initialValues }: { id: string | null; initialValues: RecipientFormValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, setError, getValues, setValue, control, formState } = useForm<RecipientFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(recipientSchema) as unknown as Resolver<RecipientFormValues>,
  });
  const err = (name: keyof RecipientFormValues) => formState.errors[name]?.message;
  const sourceUrl = useWatch({ control, name: "source_url" });

  const onSubmit = handleSubmit((values) =>
    startTransition(async () => {
      const result = await saveRecipient({ id, values });
      if (!result.ok) {
        for (const [name, messages] of Object.entries(result.errors ?? {})) {
          if (messages?.[0]) setError(name as keyof RecipientFormValues, { message: messages[0] });
        }
        toast.error(result.message);
        return;
      }
      toast.success(id ? "Destinatario actualizado." : "Destinatario creado.");
      router.push("/libreta");
    }),
  );

  const input = (name: keyof RecipientFormValues, props: React.ComponentProps<"input"> = {}) => (
    <Input id={name} {...props} {...register(name, { onBlur: props.onBlur })} aria-invalid={Boolean(err(name)) || undefined} />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-10">
      <div className="grid gap-5 sm:grid-cols-6">
        <Field label="Empresa" htmlFor="company_name" error={err("company_name")} className="sm:col-span-6">
          {input("company_name")}
        </Field>
        <Field label="Dirección" htmlFor="address" error={err("address")} className="sm:col-span-6">
          {input("address")}
        </Field>
        <Field label="Código postal" htmlFor="postal_code" error={err("postal_code")} className="sm:col-span-2">
          {input("postal_code", {
            inputMode: "numeric",
            className: "font-mono",
            onBlur: () => {
              const province = provinceFromPostalCode(getValues("postal_code"));
              if (province && !getValues("province").trim()) setValue("province", province);
            },
          })}
        </Field>
        <Field label="Ciudad" htmlFor="city" error={err("city")} className="sm:col-span-4">
          {input("city")}
        </Field>
        <Field label="Provincia" htmlFor="province" error={err("province")} className="sm:col-span-3">
          {input("province")}
        </Field>
        <Field label="País" htmlFor="country" error={err("country")} className="sm:col-span-3">
          {input("country")}
        </Field>
        <Field label="Persona de contacto" htmlFor="contact_person" error={err("contact_person")} className="sm:col-span-2">
          {input("contact_person")}
        </Field>
        <Field label="Teléfono" htmlFor="phone" error={err("phone")} className="sm:col-span-2">
          {input("phone", { type: "tel", className: "font-mono" })}
        </Field>
        <Field label="Email" htmlFor="email" error={err("email")} className="sm:col-span-2">
          {input("email", { type: "email", className: "font-mono" })}
        </Field>
        <Field label="Notas" htmlFor="notes" error={err("notes")} hint="Horario de recepción, planta, a quién preguntar…" className="sm:col-span-6">
          <Textarea id="notes" rows={3} {...register("notes")} />
        </Field>
        <Field label="URL de origen del dato" htmlFor="source_url" error={err("source_url")} className="sm:col-span-4">
          <div className="flex gap-2">
            {input("source_url", { type: "url", className: "font-mono", placeholder: "https://" })}
            {sourceUrl && /^https?:\/\//i.test(sourceUrl) ? (
              <Button variant="outline" size="icon" asChild>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir la fuente">
                  <ExternalLink />
                </a>
              </Button>
            ) : null}
          </div>
        </Field>
        <Field label="Verificado el" htmlFor="verified_at" error={err("verified_at")} className="sm:col-span-2">
          {input("verified_at", { type: "date", className: "font-mono" })}
        </Field>
        <label className="flex items-center gap-3 text-sm sm:col-span-6">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" {...register("is_favorite")} />
          Favorito (aparece primero en el autocompletado)
        </label>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {id ? "Guardar cambios" : "Crear destinatario"}
        </Button>
      </div>
    </form>
  );
}
