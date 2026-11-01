"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Combine, Pencil, Send, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import type { RecipientRow } from "@/lib/recipients/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteRecipient, mergeRecipients, setFavorite, type ActionResult } from "./actions";


function notify(result: ActionResult) {
  if (!result.ok) toast.error(result.message);
  else if (result.message) toast.success(result.message);
}

export function RecipientTable({
  rows,
  currentUserId,
  isAdmin,
  query,
}: {
  rows: RecipientRow[];
  currentUserId: string;
  isAdmin: boolean;
  query: string;
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [keep, setKeep] = useState<string | null>(null);
  const visible = selected.filter((id) => rows.some((r) => r.id === id));
  const pair = visible.length === 2 ? visible.map((id) => rows.find((r) => r.id === id)!) : null;

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]));
    setKeep(null);
  }

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-dashed border-line px-6 py-12 text-center text-muted">
        {query ? `Nada coincide con «${query}».` : "La libreta está vacía. Los destinos se guardan al enviar una solicitud."}
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {pair ? (
        <div className="grid gap-4 rounded-xl border border-accent/30 bg-accent-soft p-5" role="region" aria-label="Fusionar duplicados">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">¿Cuál conservas? El otro se borra y sus envíos pasan al que conserves.</p>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              <X /> Cancelar
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {pair.map((r) => (
              <label
                key={r.id}
                className={cn(
                  "grid cursor-pointer gap-1 rounded-lg border bg-surface p-4 text-sm",
                  keep === r.id ? "border-accent ring-1 ring-accent" : "border-line",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" name="keep" className="accent-[var(--accent)]" checked={keep === r.id} onChange={() => setKeep(r.id)} />
                  {r.company_name}
                </span>
                <span className="text-muted">
                  {[r.address, r.postal_code, r.city].filter(Boolean).join(" · ") || "Sin dirección"}
                </span>
                <span className="font-mono text-xs text-muted">{r.usage_count} envíos</span>
              </label>
            ))}
          </div>
          <div>
            <Button
              disabled={!keep || pending}
              onClick={() => {
                const drop = pair.find((r) => r.id !== keep)!;
                startTransition(async () => {
                  const result = await mergeRecipients(keep!, drop.id);
                  notify(result);
                  if (result.ok) setSelected([]);
                });
              }}
            >
              <Combine /> Fusionar
            </Button>
          </div>
        </div>
      ) : null}

      <Table>
        <thead>
          <tr>
            <Th className="w-10">
              <span className="sr-only">Seleccionar para fusionar</span>
            </Th>
            <Th>Empresa</Th>
            <Th className="hidden md:table-cell">Contacto</Th>
            <Th className="text-right">Envíos</Th>
            <Th className="hidden sm:table-cell">Último envío</Th>
            <Th className="text-right">
              <span className="sr-only">Acciones</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const canDelete = isAdmin || r.created_by === currentUserId;
            return (
              <tr key={r.id} className={cn("transition-colors hover:bg-surface-2/50", visible.includes(r.id) && "bg-accent-soft/60")}>
                <Td>
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--accent)]"
                    checked={visible.includes(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Seleccionar ${r.company_name} para fusionar`}
                  />
                </Td>
                <Td>
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      aria-pressed={r.is_favorite}
                      aria-label={r.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                      disabled={pending}
                      onClick={() => startTransition(async () => notify(await setFavorite(r.id, !r.is_favorite)))}
                      className="mt-0.5 text-muted hover:text-kraft"
                    >
                      <Star className={cn("size-4", r.is_favorite && "fill-kraft text-kraft")} />
                    </button>
                    <div className="grid gap-0.5">
                      <Link href={`/libreta/${r.id}`} className="font-medium hover:underline">
                        {r.company_name}
                      </Link>
                      <span className="text-sm text-muted">
                        {[r.address, [r.postal_code, r.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Sin dirección"}
                      </span>
                    </div>
                  </div>
                </Td>
                <Td className="hidden text-sm md:table-cell">
                  <div className="grid gap-0.5">
                    <span>{r.contact_person || <span className="text-muted">—</span>}</span>
                    {r.phone ? <span className="font-mono text-xs text-muted">{r.phone}</span> : null}
                  </div>
                </Td>
                <Td className="text-right font-mono">{r.usage_count}</Td>
                <Td className="hidden font-mono text-xs text-muted sm:table-cell">{formatDate(r.last_used_at)}</Td>
                <Td>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/solicitudes/nueva?destinatario=${r.id}`} title="Nueva solicitud a este destino">
                        <Send /> <span className="hidden lg:inline">Enviar</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/libreta/${r.id}`} aria-label={`Editar ${r.company_name}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`Borrar ${r.company_name}`}
                        onClick={() => {
                          if (!confirm(`¿Borrar «${r.company_name}» de la libreta? Las solicitudes antiguas conservan sus datos.`)) return;
                          startTransition(async () => notify(await deleteRecipient(r.id)));
                        }}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <p className="text-sm text-muted">Marca dos filas para fusionar duplicados.</p>
    </div>
  );
}
