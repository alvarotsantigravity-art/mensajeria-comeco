"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Check, Copy, KeyRound, LoaderCircle, Power, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, Card } from "@/components/ui/misc";
import type { FormState } from "@/lib/validation/auth";
import { createUser, resetPassword, setUserActive } from "./actions";

/** Temporary password shown once, with a copy button. */
function TempPassword({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-lg border border-accent/30 bg-accent-soft p-4">
      <p className="text-sm">Contraseña temporal (solo se muestra ahora):</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-md bg-surface px-3 py-2 font-mono text-sm">{value}</code>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Copiar contraseña"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

export function CreateUserForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createUser, {});
  const err = (name: string) => state.errors?.[name]?.[0];

  return (
    <Card className="grid gap-5">
      <div className="grid gap-1">
        <h3 className="text-lg font-semibold">Nuevo usuario</h3>
        <p className="text-sm text-muted">Solo cuentas @comecografico.com.</p>
      </div>
      <form action={action} className="grid gap-4" noValidate>
        {state.message && !state.ok ? <Alert tone="error">{state.message}</Alert> : null}
        {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
        {state.tempPassword ? <TempPassword value={state.tempPassword} /> : null}

        <Field label="Nombre y apellidos" htmlFor="new-full_name" error={err("full_name")}>
          <Input id="new-full_name" name="full_name" aria-invalid={Boolean(err("full_name")) || undefined} />
        </Field>
        <Field label="Email" htmlFor="new-email" error={err("email")}>
          <Input id="new-email" name="email" type="email" placeholder="nombre@comecografico.com" aria-invalid={Boolean(err("email")) || undefined} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <UserPlus />}
          Crear usuario
        </Button>
      </form>
    </Card>
  );
}

export function UserRowActions({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FormState | null>(null);

  useEffect(() => {
    if (!result?.message) return;
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  }, [result]);

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Generar una nueva contraseña temporal para este usuario?")) return;
            startTransition(async () => setResult(await resetPassword(userId)));
          }}
        >
          <KeyRound /> Restablecer
        </Button>
        {!isSelf ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await setUserActive(userId, !active)))}
          >
            <Power /> {active ? "Desactivar" : "Activar"}
          </Button>
        ) : null}
      </div>
      {result?.tempPassword ? (
        <div className="w-full max-w-xs text-left">
          <TempPassword value={result.tempPassword} />
        </div>
      ) : null}
    </div>
  );
}
