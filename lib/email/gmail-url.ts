// Enlace de redacción de Gmail (§5.4). Codificado, el correo de la plantilla ocupa
// ~2.500 caracteres; Gmail rechaza URLs de más de ~8.000, así que el corte va en 6.000.
export const GMAIL_URL_LIMIT = 6000;

export function buildGmailUrl({
  to,
  cc,
  subject,
  body,
  authuser,
}: {
  to: string[];
  cc: string[];
  subject: string;
  body?: string;
  authuser?: string;
}): string {
  const params: [string, string][] = [
    ["view", "cm"],
    ["fs", "1"],
    ["to", to.join(",")],
  ];
  if (cc.length) params.push(["cc", cc.join(",")]);
  params.push(["su", subject]);
  if (body) params.push(["body", body]);
  if (authuser) params.push(["authuser", authuser]);

  const query = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `https://mail.google.com/mail/?${query}`;
}
