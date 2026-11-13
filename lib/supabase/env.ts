// Variáveis públicas do Supabase (projeto de desenvolvimento na nuvem), lidas do `.env.local`. Modelo em `.env.example`.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
