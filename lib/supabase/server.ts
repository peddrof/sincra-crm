import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { supabaseKey, supabaseUrl } from "./env";

// Cliente para Server Components, Server Actions e Route Handlers.
// Crie um novo a cada requisição. Com cacheComponents ligado, quem chama
// precisa estar dentro de <Suspense>, porque lê cookies da requisição.
export async function createClient() {
  // O cliente do Supabase lê o relógio (validade do token). connection() avisa o Next de que
  // daqui em diante tudo é da requisição, sem tentar pré-renderizar (evita o erro de Date.now()).
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component, onde não dá para gravar cookies.
          // O proxy.ts já renova a sessão a cada requisição.
        }
      },
    },
  });
}
