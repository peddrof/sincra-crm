import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getSocio } from "@/lib/auth";
import { configuracaoFaltando, urlAutorizacao } from "@/lib/google/oauth";

// Inicia o OAuth com o Google. O "state" vai num cookie httpOnly e é conferido no retorno.
export async function GET() {
  await getSocio();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (configuracaoFaltando().length) return NextResponse.redirect(`${base}/configuracoes?google=faltando`);

  const state = randomBytes(24).toString("base64url");
  const resposta = NextResponse.redirect(urlAutorizacao(state));
  resposta.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: base.startsWith("https"),
    path: "/integracoes/google",
    maxAge: 600,
  });
  return resposta;
}
