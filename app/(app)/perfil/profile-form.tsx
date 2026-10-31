"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import type { Profile } from "@/lib/auth/dal";
import type { FormState } from "@/lib/validation/auth";
import { updateProfile } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const err = (name: string) => state.errors?.[name]?.[0];

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="grid gap-6 rounded-xl border border-line bg-surface p-6 sm:grid-cols-2 sm:p-8" noValidate>
      {state.message && !state.ok ? (
        <Alert tone="error" className="sm:col-span-2">{state.message}</Alert>
      ) : null}

      <Field label="Nombre y apellidos" htmlFor="full_name" error={err("full_name")} className="sm:col-span-2">
        <Input id="full_name" name="full_name" defaultValue={profile.full_name} autoComplete="name" aria-invalid={Boolean(err("full_name")) || undefined} />
      </Field>

      <Field label="Email" htmlFor="email" hint="Lo gestiona el administrador.">
        <Input id="email" value={profile.email} readOnly disabled className="font-mono" />
      </Field>

      <Field label="Teléfono" htmlFor="phone" error={err("phone")}>
        <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" placeholder="916 76 75 04" className="font-mono" aria-invalid={Boolean(err("phone")) || undefined} />
      </Field>

      <Field label="Sociedad / empresa" htmlFor="company" error={err("company")}>
        <Input id="company" name="company" defaultValue={profile.company} autoComplete="organization" aria-invalid={Boolean(err("company")) || undefined} />
      </Field>

      <Field label="CECO por defecto" htmlFor="default_ceco" error={err("default_ceco")}>
        <Input id="default_ceco" name="default_ceco" defaultValue={profile.default_ceco} inputMode="numeric" className="font-mono" aria-invalid={Boolean(err("default_ceco")) || undefined} />
      </Field>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Guardar perfil
        </Button>
      </div>
    </form>
  );
}
