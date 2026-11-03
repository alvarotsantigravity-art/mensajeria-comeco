export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** False until the Supabase env vars are filled in (.env.local / Vercel). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
