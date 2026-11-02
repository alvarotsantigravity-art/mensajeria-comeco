"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Printer, Repeat2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { Table, Td, Th } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatRequestDate } from "@/lib/email/build-body";
import type { HistoryRow } from "@/lib/requests/history";
import { STATUS_LABEL, URGENCY_SHORT, type Status, type Urgency } from "@/lib/requests/options";
import { deleteRequests, setRequestStatus } from "./actions";

const STATUS_TONE: Record<Status, "neutral" | "accent" | "success" | "urgent"> = {
  borrador: "neutral",
  enviada: "accent",
  entregada: "success",
  cancelada: "urgent",
};

export function HistoryTable({
  rows,
  currentUserId,
  isAdmin,
  carrierNames,
}: {
  rows: HistoryRow[];
  currentUserId: string;
  isAdmin: boolean;
  carrierNames: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Se puede borrar lo que permite la RLS: el admin, todo; el resto, sus borradores.
  const canDelete = (r: HistoryRow) => isAdmin || (r.requester_id === currentUserId && r.status === "borrador");
  const deletable = rows.filter(canDelete);
  // Al cambiar de página o filtros, solo cuentan las filas visibles.
  const selected = deletable.filter((r) => picked.has(r.id));
  const allPicked = deletable.length > 0 && selected.length === deletable.length;

  const toggle = (id: string, on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  function removeSelected() {
    const refs = selected.map((r) => r.ref);
    const list = refs.length > 5 ? `${refs.slice(0, 5).join(", ")}… (${refs.length})` : refs.join(", ");
    const what = refs.length === 1 ? "esta solicitud" : `estas ${refs.length} solicitudes`;
    if (!confirm(`¿Eliminar definitivamente ${what}?\n\n${list}\n\nNo se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteRequests(selected.map((r) => r.id));
      if (result.ok) {
        toast.success(result.message);
        setPicked(new Set());
      } else toast.error(result.message);
    });
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-muted">
        No hay solicitudes con estos filtros.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {selected.length ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm" role="status">
          <span className="font-medium">
            {selected.length} {selected.length === 1 ? "seleccionada" : "seleccionadas"}
          </span>
          <Button variant="danger" size="sm" onClick={removeSelected} disabled={pending}>
            <Trash2 /> Eliminar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPicked(new Set())} disabled={pending}>
            <X /> Quitar selección
          </Button>
        </div>
      ) : null}
      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              {deletable.length ? (
                <input
                  type="checkbox"
                  aria-label="Seleccionar todas las que puedes eliminar"
                  checked={allPicked}
                  onChange={(e) => setPicked(e.target.checked ? new Set(deletable.map((r) => r.id)) : new Set())}
                  className="size-4 accent-[var(--accent)]"
                />
              ) : null}
            </Th>
            <Th>Ref.</Th>
            <Th>Destino</Th>
            <Th className="hidden md:table-cell">Proveedor</Th>
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
              <tr key={r.id} className={cn("transition-colors hover:bg-surface-2/50", picked.has(r.id) && "bg-accent-soft/40")}>
                <Td className="w-10">
                  {canDelete(r) ? (
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${r.ref}`}
                      checked={picked.has(r.id)}
                      onChange={(e) => toggle(r.id, e.target.checked)}
                      className="size-4 accent-[var(--accent)]"
                    />
                  ) : null}
                </Td>
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
                    {r.carrier !== "mensajeria" && (r.op || r.product) ? (
                      <span className="line-clamp-1 text-sm text-muted">{[r.op, r.product].filter(Boolean).join(" · ")}</span>
                    ) : r.concept ? (
                      <span className="line-clamp-1 text-sm text-muted">{r.concept}</span>
                    ) : null}
                  </Link>
                </Td>
                <Td className="hidden text-sm whitespace-nowrap md:table-cell">{carrierNames[r.carrier] ?? r.carrier}</Td>
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
    </div>
  );
}
