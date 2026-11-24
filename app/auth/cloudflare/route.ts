import { NextResponse, type NextRequest } from "next/server";
import { accessConfigurado, emailDoAccess } from "@/lib/cloudflare-access";
import { adminConfigurado, createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Login único pelo Cloudflare Access (Google). A Cloudflare já autenticou o sócio; aqui a plataforma abre a
// sessão do Supabase para o MESMO e-mail, sem senha e sem mandar e-mail: o admin gera o token de link mágico
// e o servidor o troca pela sessão na hora. Só entra quem já existe em auth.users (ninguém é criado aqui);
// sem perfil ativo em `profiles`, o getSocio leva para /sem-acesso, como no login por senha.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const proximo = destinoSeguro(searchParams.get("proximo"));
  const falha = (motivo: string) => {
    console.error("[auth/cloudflare]", motivo);
    return NextResponse.redirect(new URL("/login?erro=access", origin));
  };

  if (!accessConfigurado || !adminConfigurado()) return falha("Access ou SUPABASE_SECRET_KEY não configurados");
  const email = await emailDoAccess(request);
  if (!email) return falha("token do Access ausente ou inválido");

  const admin = createAdminClient();
  // Poucos usuários (os sócios): uma página basta. Conferir antes evita que o generateLink crie alguém novo.
  const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (erroLista) return falha(`listUsers: ${erroLista.message}`);
  if (!lista.users.some((u) => u.email?.toLowerCase() === email)) return falha(`sem conta no Supabase: ${email}`);

  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (erroLink || !tokenHash) return falha(`generateLink: ${erroLink?.message ?? "sem token"}`);

  const supabase = await createClient();
  // Se havia sessão de outro sócio neste navegador, encerra antes (só neste dispositivo).
  await supabase.auth.signOut({ scope: "local" });
  const { error: erroSessao } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  if (erroSessao) return falha(`verifyOtp: ${erroSessao.message}`);

  return NextResponse.redirect(new URL(proximo, origin));
}

// Só caminhos internos (evita redirecionar para outro site).
function destinoSeguro(valor: string | null): string {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/auth/")) return "/";
  return valor;
}
