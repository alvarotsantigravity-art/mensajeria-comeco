export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until the Supabase env vars are filled in (.env.local / Vercel). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const allowedEmailDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "comecografico.com")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isAllowedEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1];
  return Boolean(domain) && allowedEmailDomains.includes(domain);
}
