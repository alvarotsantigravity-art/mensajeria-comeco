"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { changePassword } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import type { FormState } from "@/lib/validation/auth";

export function ChangePasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={action} className="grid gap-5" noValidate>
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">Nueva contraseña</h2>
        <p className="text-sm text-muted">
          Sustituye la contraseña temporal de <span className="font-mono">{email}</span>.
        </p>
      </div>

      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      {/* Lets password managers associate the new password with the account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

      <Field label="Nueva contraseña" htmlFor="password" hint="Mínimo 10 caracteres." error={state.errors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          aria-invalid={Boolean(state.errors?.password) || undefined}
        />
      </Field>
      <Field label="Repite la contraseña" htmlFor="confirm" error={state.errors?.confirm?.[0]}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.errors?.confirm) || undefined}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
        Guardar y continuar
      </Button>
    </form>
  );
}
