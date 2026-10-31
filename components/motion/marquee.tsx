import { cn } from "@/lib/utils";

/** Infinite text strip ("Solicitar · Embalar · Etiquetar · Enviar ·"). Decorative. */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = items.map((item) => `${item} · `).join("");
  return (
    <div aria-hidden className={cn("overflow-hidden whitespace-nowrap", className)}>
      <div className="inline-flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <span key={copy} className="pr-2">
            {row.repeat(4)}
          </span>
        ))}
      </div>
    </div>
  );
}
