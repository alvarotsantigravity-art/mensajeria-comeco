/** Vista previa del correo tal como saldrá en Gmail (texto plano). */
export function EmailPreview({
  to,
  cc,
  subject,
  body,
}: {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-line bg-surface">
      <dl className="grid gap-1.5 border-b border-line px-5 py-4 text-sm">
        <Row label="Para" value={to.join(", ")} />
        <Row label="CC" value={cc.join(", ") || "—"} />
        <Row label="Asunto" value={subject} strong />
      </dl>
      <pre className="max-h-[60vh] overflow-auto px-5 py-4 font-mono text-[12px] leading-relaxed whitespace-pre text-ink">
        {body}
      </pre>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? "font-medium break-words" : "font-mono text-[13px] break-all"}>{value}</dd>
    </div>
  );
}
