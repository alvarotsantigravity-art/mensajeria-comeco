"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Printer, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { formatRequestDate } from "@/lib/email/build-body";
import type { HistoryRow } from "@/lib/requests/history";
import { STATUS_LABEL, URGENCY_SHORT, type Status, type Urgency } from "@/lib/requests/options";
import { setRequestStatus } from "./actions";

const STATUS_TONE: Record<Status, "neutral" | "accent" | "success" | "urgent"> = {
  borrador: "neutral",
  enviada: "accent",
  entregada: "success",
  cancelada: "urgent",
};

export function HistoryTable({ rows, currentUserId, isAdmin }: { rows: HistoryRow[]; currentUserId: string; isAdmin: boolean }) {
  const [pending, startTransition] = useTransition();

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-muted">
        No hay solicitudes con estos filtros.
      </p>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Ref.</Th>
          <Th>Destino</Th>
          <Th className="hidden lg:table-cell">Solicitante</Th>
          <Th className="hidden sm:table-cell">Fecha</Th>
          <Th>Estado</Th>
          <Th className="text-right">
            <span className="sr-only">Acciones</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const status = r.status as Status;
          const editable = status !== "borrador" && (isAdmin || r.requester_id === currentUserId);
          return (
            <tr key={r.id} className="transition-colors hover:bg-surface-2/50">
              <Td className="font-mono text-xs whitespace-nowrap">
                <Link href={`/solicitudes/${r.id}`} className="hover:underline">
                  {r.ref}
                </Link>
              </Td>
              <Td>
                <Link href={`/solicitudes/${r.id}`} className="grid gap-0.5">
                  <span className="font-medium">
                    {r.dest_company || <span className="text-muted">Sin destino</span>}
                    {r.dest_city ? <span className="font-normal text-muted"> · {r.dest_city}</span> : null}
                  </span>
                  {r.concept ? <span className="line-clamp-1 text-sm text-muted">{r.concept}</span> : null}
                </Link>
              </Td>
              <Td className="hidden text-sm lg:table-cell">{r.requester_name}</Td>
              <Td className="hidden font-mono text-xs text-muted sm:table-cell">{formatRequestDate(r.request_date)}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-1.5">
                  {editable ? (
                    <label>
                      <span className="sr-only">Estado de {r.ref}</span>
                      <select
                        key={status}
                        defaultValue={status}
                        disabled={pending}
                        onChange={(e) => {
                          const next = e.target.value;
                          startTransition(async () => {
                            const result = await setRequestStatus(r.id, next);
                            if (result.ok) toast.success(result.message);
                            else toast.error(result.message);
                          });
                        }}
                        className="h-8 rounded-full border border-line bg-surface px-2.5 text-xs outline-none focus:border-accent"
                      >
                        {(["enviada", "entregada", "cancelada"] as const).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                  )}
                  {r.urgency === "urgente" ? <Badge tone="urgent">{URGENCY_SHORT[r.urgency as Urgency]}</Badge> : null}
                </div>
              </Td>
              <Td className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/solicitudes/nueva?repetir=${r.id}`} title="Nueva solicitud con estos datos y la fecha de hoy">
                    <Repeat2 /> <span className="hidden md:inline">Repetir</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/etiquetas?solicitud=${r.id}`} aria-label={`Etiquetas de ${r.ref}`} title="Imprimir etiquetas">
                    <Printer />
                  </Link>
                </Button>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
