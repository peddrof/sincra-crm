import "server-only";
import { createClient as criarCliente } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

// Cliente com a chave secreta (ignora RLS). Uso restrito: a conexão com o Google (public.integracoes_google),
// que nenhum sócio acessa pela API, e o login único do Cloudflare Access (/auth/cloudflare). Nunca para dados de clientes.
// Aceita a secret key nova (sb_secret_..., em SUPABASE_SECRET_KEY) ou a service_role legada (SUPABASE_SERVICE_ROLE_KEY).
function chaveSecreta(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function createAdminClient() {
  const chave = chaveSecreta();
  if (!chave) throw new Error("SUPABASE_SECRET_KEY ausente (ver .env.example).");
  return criarCliente<Database>(supabaseUrl, chave, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function adminConfigurado(): boolean {
  return Boolean(chaveSecreta());
}
