"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { saveLegalData, type LegalFormState } from "./actions";

export type LegalData = {
  legal_name: string;
  legal_address: string;
  legal_tax_id: string;
  delivery_note_waste: string;
  delivery_note_legal: string;
};

export function LegalForm({ data }: { data: LegalData }) {
  const [state, action, pending] = useActionState<LegalFormState, FormData>(saveLegalData, {});
  const e = (name: keyof LegalData) => state.errors?.[name]?.[0];

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid max-w-3xl gap-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-6">
        <Field label="Razón social" htmlFor="legal_name" error={e("legal_name")} className="sm:col-span-4">
          <Input id="legal_name" name="legal_name" defaultValue={data.legal_name} />
        </Field>
        <Field label="N.I.F." htmlFor="legal_tax_id" error={e("legal_tax_id")} className="sm:col-span-2">
          <Input id="legal_tax_id" name="legal_tax_id" className="font-mono uppercase" defaultValue={data.legal_tax_id} />
        </Field>
        <Field label="Dirección" htmlFor="legal_address" error={e("legal_address")} className="sm:col-span-6">
          <Input id="legal_address" name="legal_address" defaultValue={data.legal_address} />
        </Field>
        <Field label="Texto de residuos (recuadro junto a la firma)" htmlFor="delivery_note_waste" error={e("delivery_note_waste")} className="sm:col-span-6">
          <Textarea id="delivery_note_waste" name="delivery_note_waste" rows={6} defaultValue={data.delivery_note_waste} />
        </Field>
        <Field
          label="Pie legal (certificados y registro)"
          htmlFor="delivery_note_legal"
          error={e("delivery_note_legal")}
          hint="Una línea por renglón."
          className="sm:col-span-6"
        >
          <Textarea id="delivery_note_legal" name="delivery_note_legal" rows={4} className="font-mono text-xs" defaultValue={data.delivery_note_legal} />
        </Field>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />} Guardar
        </Button>
      </div>
    </form>
  );
}
