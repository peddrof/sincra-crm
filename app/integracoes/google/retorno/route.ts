import { NextResponse, type NextRequest } from "next/server";
import { getSocio } from "@/lib/auth";
import { concluirConexao } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

// Retorno do OAuth do Google: confere o state, troca o código e registra no feed.
export async function GET(request: NextRequest) {
  const socio = await getSocio();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const params = request.nextUrl.searchParams;
  const stateCookie = request.cookies.get("google_oauth_state")?.value;

  const destino = (situacao: string) => {
    const r = NextResponse.redirect(`${base}/configuracoes?google=${situacao}`);
    r.cookies.delete({ name: "google_oauth_state", path: "/integracoes/google" });
    return r;
  };

  if (params.get("error")) return destino("recusado");
  const codigo = params.get("code");
  if (!codigo || !stateCookie || params.get("state") !== stateCookie) return destino("invalido");

  try {
    const email = await concluirConexao(codigo, socio.id);
    const supabase = await createClient();
    await supabase.from("activity_events").insert({
      actor_type: "user",
      actor_id: socio.id,
      event_type: "integration.google_connected",
      area: "geral",
      entity_type: "settings",
      summary: `${socio.apelido ?? socio.nome.split(" ")[0]} conectou o Google (${email}) para Drive e agenda`,
    });
    return destino("conectado");
  } catch (e) {
    console.error("[google] falha no retorno:", e instanceof Error ? e.message : e);
    return destino("erro");
  }
}
