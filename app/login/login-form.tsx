"use client";

import { useActionState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { signIn } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import type { FormState } from "@/lib/validation/auth";

export function LoginForm({ next, inactive }: { next: string; inactive: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});

  return (
    <form action={action} className="grid gap-5" noValidate>
      <div className="grid gap-1">
        <h2 className="text-xl font-semibold">Entrar</h2>
        <p className="text-sm text-muted">Usa tu cuenta @comecografico.com.</p>
      </div>

      {inactive ? <Alert tone="error">Tu cuenta está desactivada. Habla con el administrador.</Alert> : null}
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <input type="hidden" name="next" value={next} />

      <Field label="Email" htmlFor="email" error={state.errors?.email?.[0]}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="nombre@comecografico.com"
          required
          aria-invalid={Boolean(state.errors?.email) || undefined}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={state.errors?.password?.[0]}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.errors?.password) || undefined}
          aria-describedby={state.errors?.password ? "password-error" : undefined}
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="mt-1">
        {pending ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
        Entrar
      </Button>

      <p className="text-[13px] text-muted">
        ¿No tienes cuenta o has olvidado la contraseña? Pídesela al administrador.
      </p>
    </form>
  );
}
