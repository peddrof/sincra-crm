"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { status: "inicial" } | { status: "erro"; mensagem: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// E-mail e senha (22/11/2026): o link mágico dependia do e-mail padrão do Supabase, que só entrega para membros
// da organização no painel. Ninguém se cadastra: os três sócios são criados no painel e a senha é definida lá
// (ver README, "Cadastrar um sócio"). Sem perfil ativo em `profiles`, quem entra cai em /sem-acesso.
export async function entrar(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  if (!EMAIL.test(email)) return { status: "erro", mensagem: "Informe um e-mail válido.", email };
  if (!senha) return { status: "erro", mensagem: "Informe a senha.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    if (error.status === 429 || error.code === "over_request_rate_limit") {
      return { status: "erro", mensagem: "Muitas tentativas em pouco tempo. Tente de novo em alguns minutos.", email };
    }
    // Mesma resposta para e-mail sem conta e senha errada, para não revelar quem tem acesso.
    if (error.code === "invalid_credentials" || error.status === 400) {
      return { status: "erro", mensagem: "E-mail ou senha incorretos.", email };
    }
    console.error("[login] falha ao entrar:", error.code, error.message);
    return { status: "erro", mensagem: "Não foi possível entrar agora. Tente de novo.", email };
  }

  redirect("/");
}
