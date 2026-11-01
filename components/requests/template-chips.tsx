"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bookmark, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteTemplate } from "@/app/(app)/solicitudes/template-actions";

type Template = { id: string; name: string; created_by: string };

/** Empezar desde una plantilla de envío frecuente (§5.5). */
export function TemplateChips({
  templates,
  activeId,
  currentUserId,
  isAdmin,
}: {
  templates: Template[];
  activeId: string | null;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Plantillas">
      <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-xs text-muted">
        <Bookmark className="size-3.5" aria-hidden /> Plantillas
      </span>
      {templates.map((t) => {
        const active = t.id === activeId;
        const canDelete = isAdmin || t.created_by === currentUserId;
        return (
          <span
            key={t.id}
            className={cn(
              "inline-flex items-center rounded-full border text-sm transition-colors",
              active ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-ink/40",
            )}
          >
            <Link
              href={active ? "/solicitudes/nueva" : `/solicitudes/nueva?plantilla=${t.id}`}
              aria-current={active || undefined}
              className={cn("py-1.5 pl-3", canDelete ? "pr-1" : "pr-3")}
            >
              {t.name}
            </Link>
            {canDelete ? (
              <button
                type="button"
                disabled={pending}
                aria-label={`Borrar la plantilla ${t.name}`}
                onClick={() => {
                  if (!confirm(`¿Borrar la plantilla «${t.name}»?`)) return;
                  startTransition(async () => {
                    const result = await deleteTemplate(t.id);
                    if (result.ok) toast.success(result.message);
                    else toast.error(result.message);
                  });
                }}
                className="grid size-7 place-items-center rounded-full opacity-60 hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
