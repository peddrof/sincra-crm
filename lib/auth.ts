import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Socio = {
  id: string;
  nome: string;
  apelido: string | null;
};

// Camada de acesso: quem está logado E tem perfil ativo em `profiles`.
// - Sem sessão → /login.
// - Com sessão, mas sem perfil ativo → /sem-acesso. A própria RLS esconde o perfil inativo
//   (a política exige private.is_active_member()), então "não achou" cobre os dois casos.
// Lê cookies: chame dentro de <Suspense>. `cache` evita repetir a consulta na mesma requisição.
// Não usar "use cache" aqui: dado pessoal não fica em cache no servidor.
export const getSocio = cache(async (): Promise<Socio> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, nickname")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil) redirect("/sem-acesso");

  return { id: perfil.id, nome: perfil.full_name, apelido: perfil.nickname };
});
