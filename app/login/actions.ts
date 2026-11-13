"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin =
  | { status: "inicial" }
  | { status: "enviado"; email: string }
  | { status: "erro"; mensagem: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pede o link mágico ao Supabase. Nunca cria usuário: só sócios cadastrados no painel entram.
export async function enviarLink(_anterior: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) {
    return { status: "erro", mensagem: "Informe um e-mail válido.", email };
  }

  const origem =
    process.env.NEXT_PUBLIC_APP_URL ?? (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origem}/auth/confirm` },
  });

  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        status: "erro",
        mensagem: "Muitos pedidos de link em pouco tempo. Tente de novo em alguns minutos.",
        email,
      };
    }
    // E-mail sem conta: responde igual ao sucesso, para não revelar quem tem acesso.
    const semConta =
      error.code === "otp_disabled" || error.code === "signup_disabled" || /signups? not allowed/i.test(error.message);
    if (!semConta) {
      console.error("[login] falha ao enviar link:", error.code, error.message);
      return { status: "erro", mensagem: "Não foi possível enviar o link agora. Tente de novo.", email };
    }
  }

  return { status: "enviado", email };
}
