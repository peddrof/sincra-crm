import "server-only";
import { createClient as criarCliente } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

// Cliente com a chave secreta (ignora RLS). Uso restrito: ler e gravar a conexão com o Google
// (public.integracoes_google), que nenhum sócio acessa pela API. Nunca usar para dados de clientes.
export function createAdminClient() {
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente no .env.local (ver docs/10-integracao-google.md).");
  return criarCliente<Database>(supabaseUrl, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminConfigurado(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
