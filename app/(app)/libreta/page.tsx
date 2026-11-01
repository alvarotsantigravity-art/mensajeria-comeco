import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { searchRecipients } from "@/lib/recipients/data";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/misc";
import { ListSearch } from "@/components/list-search";
import { RecipientTable } from "./recipient-table";

export const metadata: Metadata = { title: "Libreta" };

export default function AddressBookPage({ searchParams }: PageProps<"/libreta">) {
  return (
    <div className="grid gap-10">
      <header className="flex flex-wrap items-end justify-between gap-6 pt-6">
        <div className="grid gap-4">
          <span className="font-mono text-xs text-muted">Libreta compartida</span>
          <h1 className="animate-rise text-display font-semibold">Destinatarios.</h1>
        </div>
        <Button asChild>
          <Link href="/libreta/nuevo">
            <Plus /> Nuevo destinatario
          </Link>
        </Button>
      </header>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <AddressBook searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AddressBook({ searchParams }: Pick<PageProps<"/libreta">, "searchParams">) {
  const profile = await requireUser();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const favorites = params.favoritos === "1";
  const rows = await searchRecipients(q, 50, favorites);

  return (
    <div className="grid gap-6">
      <ListSearch
        placeholder="Busca por empresa, ciudad o contacto…"
        chips={[{ param: "favoritos", value: "1", label: "★ Favoritos" }]}
      />
      <RecipientTable rows={rows} currentUserId={profile.id} isAdmin={profile.role === "admin"} query={q} />
    </div>
  );
}
