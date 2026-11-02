import { DitherCanvas } from "@/components/motion/dither-canvas";
import { Marquee } from "@/components/motion/marquee";
import { PackageShowcase } from "@/components/package/package-video";

/** Split hero used by /login and /cambiar-contrasena (§6.3). */
export function AuthShell({
  eyebrow,
  title,
  children,
  showcase = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Vídeo de la caja como presentación (solo en pantallas grandes). */
  showcase?: boolean;
}) {
  return (
    <main className="relative grid min-h-dvh grid-rows-[1fr_auto] overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-90 [mask-image:linear-gradient(to_right,transparent_35%,black_80%)] max-lg:[mask-image:linear-gradient(to_bottom,transparent_55%,black_95%)]">
        <DitherCanvas />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1440px] items-center gap-12 px-4 py-12 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:px-12">
        <div className="grid gap-6">
          <span className="font-mono text-xs text-muted">{eyebrow}</span>
          <h1 className="animate-rise text-display font-semibold">{title}</h1>
          <p className="max-w-md text-lg text-muted">
            Solicitudes de mensajería, libreta de direcciones y etiquetas de Comeco Gráfico, en un
            solo sitio.
          </p>
          {showcase ? <PackageShowcase className="hidden w-full max-w-xl lg:block" /> : null}
        </div>
        <div className="w-full max-w-md rounded-xl border border-line bg-surface/90 p-6 backdrop-blur sm:p-8 lg:justify-self-end">
          {children}
        </div>
      </div>

      <Marquee
        items={["Solicitar", "Embalar", "Etiquetar", "Enviar"]}
        className="relative border-t border-line bg-bg/80 py-4 font-mono text-sm text-muted backdrop-blur"
      />
    </main>
  );
}
