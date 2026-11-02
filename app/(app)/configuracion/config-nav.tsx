import Link from "next/link";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/configuracion/usuarios", label: "Usuarios" },
  { href: "/configuracion/proveedores", label: "Proveedores" },
  { href: "/configuracion/albaran", label: "Albarán" },
] as const;

/** Pestañas de Configuración (solo admin). */
export function ConfigNav({ current }: { current: (typeof LINKS)[number]["href"] }) {
  return (
    <nav aria-label="Configuración" className="flex gap-1 rounded-lg bg-line/50 p-1 text-sm sm:w-fit">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.href === current ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-4 py-1.5 text-center transition-colors",
            link.href === current ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
