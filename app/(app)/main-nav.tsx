"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Routes for later phases are listed but disabled until they exist.
const items = [
  { href: "/", label: "Inicio", ready: true },
  { href: "/solicitudes/nueva", label: "Nueva solicitud", ready: false },
  { href: "/historial", label: "Historial", ready: false },
  { href: "/libreta", label: "Libreta", ready: false },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        if (!item.ready) {
          return (
            <span
              key={item.href}
              aria-disabled
              title="Disponible en una próxima fase"
              className="cursor-not-allowed rounded-full px-3 py-1.5 text-sm text-muted/60"
            >
              {item.label}
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors",
              active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
