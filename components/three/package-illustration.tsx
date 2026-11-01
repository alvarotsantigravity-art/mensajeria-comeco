import type { PackageVariant } from "./scene-params";

/**
 * Ilustración estática por etapa: placeholder mientras carga la escena 3D,
 * alternativa sin WebGL y modo "movimiento reducido" (§6.4).
 */
export function PackageIllustration({ stage, variant }: { stage: number; variant: PackageVariant }) {
  const kraft = "var(--kraft)";
  const dark = "color-mix(in oklab, var(--kraft) 80%, black)";
  const tape = "var(--tape)";
  const closed = stage >= 5;

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label={`Paquete en la etapa ${stage} de 5`}>
      <ellipse cx="200" cy="262" rx="150" ry="16" fill="currentColor" opacity="0.08" />

      {stage === 0 ? (
        // Plantilla desplegada en cruz
        <g transform="translate(200 175) skewX(-20) scale(1 0.55)" stroke={dark} strokeWidth="2">
          <rect x="-60" y="-45" width="120" height="90" fill={kraft} />
          <rect x="-60" y="-125" width="120" height="80" fill={kraft} />
          <rect x="-60" y="45" width="120" height="80" fill={kraft} />
          <rect x="-150" y="-45" width="90" height="90" fill={kraft} />
          <rect x="60" y="-45" width="90" height="90" fill={kraft} />
        </g>
      ) : (
        <g stroke={dark} strokeWidth="2" strokeLinejoin="round">
          {/* Lateral y frente */}
          <path d="M290 120 L330 95 L330 225 L290 250 Z" fill={dark} />
          <rect x="110" y="120" width="180" height="130" fill={kraft} />
          {closed ? (
            <>
              <path d="M110 120 L150 95 L330 95 L290 120 Z" fill={kraft} />
              <path d="M200 120 L240 95" stroke={tape} strokeWidth="18" />
              <path d="M200 120 L200 150" stroke={tape} strokeWidth="18" />
            </>
          ) : (
            <>
              {/* Solapas abiertas */}
              <path d="M110 120 L85 70 L265 70 L290 120 Z" fill={kraft} opacity="0.95" />
              <path d="M290 120 L330 95 L345 50 L305 75 Z" fill={kraft} />
              {stage >= 2 ? (
                variant.shipmentType === "documentacion" ? (
                  <rect x="150" y="88" width="110" height="40" fill="var(--surface)" transform="rotate(-8 205 108)" />
                ) : (
                  <>
                    <rect x="140" y="92" width="50" height="35" fill="var(--surface)" />
                    <circle cx="225" cy="105" r="18" fill="var(--accent)" />
                  </>
                )
              ) : null}
            </>
          )}
          {stage >= 3 ? (
            <g stroke="none">
              <rect x="125" y="160" width="100" height="60" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
              <rect x="135" y="172" width="70" height="8" fill="var(--ink)" />
              <rect x="135" y="188" width="50" height="6" fill="var(--muted)" />
              <rect x="135" y="203" width="60" height="6" fill="var(--muted)" />
            </g>
          ) : null}
          {stage >= 4 && variant.urgent ? (
            <g transform="rotate(-12 262 140)" stroke="var(--urgent)" fill="none">
              <rect x="232" y="130" width="60" height="22" rx="4" strokeWidth="3" />
              <text x="262" y="146" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--urgent)" stroke="none">
                URGENTE
              </text>
            </g>
          ) : null}
          {stage >= 4 && variant.international ? (
            <circle cx="310" cy="150" r="12" fill="var(--accent)" stroke="white" strokeWidth="3" />
          ) : null}
        </g>
      )}

      {closed ? (
        <g transform="translate(330 60)">
          <circle r="18" fill="var(--success)" />
          <path d="M-8 0 L-2 6 L9 -6" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      ) : null}
    </svg>
  );
}
