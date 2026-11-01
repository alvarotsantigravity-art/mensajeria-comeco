import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getRecipient, recipientToValues } from "@/lib/recipients/data";
import { emptyRecipient } from "@/lib/recipients/schema";
import { formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/misc";
import { RecipientForm } from "./recipient-form";

export const metadata: Metadata = { title: "Destinatario" };

export default function RecipientPage({ params }: PageProps<"/libreta/[id]">) {
  return (
    <div className="grid max-w-3xl gap-10">
      <Link href="/libreta" className="inline-flex items-center gap-2 pt-6 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Libreta
      </Link>
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <Recipient params={params} />
      </Suspense>
    </div>
  );
}

async function Recipient({ params }: Pick<PageProps<"/libreta/[id]">, "params">) {
  const { id } = await params;
  await requireUser();
  const isNew = id === "nuevo";
  const recipient = isNew ? null : await getRecipient(id);
  if (!isNew && !recipient) notFound();

  return (
    <div className="grid gap-10">
      <header className="grid gap-3">
        <h1 className="animate-rise text-display font-semibold">{recipient ? recipient.company_name : "Nuevo destinatario."}</h1>
        {recipient ? (
          <p className="font-mono text-xs text-muted">
            {recipient.usage_count} envíos · último {formatDate(recipient.last_used_at)} · actualizado {formatDate(recipient.updated_at)}
          </p>
        ) : null}
      </header>
      <RecipientForm id={recipient?.id ?? null} initialValues={recipient ? recipientToValues(recipient) : emptyRecipient} />
    </div>
  );
}
