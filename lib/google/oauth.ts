import "server-only";
import { adminConfigurado, createAdminClient } from "@/lib/supabase/admin";
import { cifrar, decifrar } from "./cripto";

// OAuth com a conta Google da Sincra (decisão #17). Uma conexão só, usada por todos os sócios.
// Passo a passo das credenciais: docs/10-integracao-google.md.

export const ESCOPOS = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export function urlRetorno(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/integracoes/google/retorno`;
}

// O que falta no .env.local para conectar (vazio = pronto).
export function configuracaoFaltando(): string[] {
  const faltam: string[] = [];
  if (!process.env.GOOGLE_CLIENT_ID) faltam.push("GOOGLE_CLIENT_ID");
  if (!process.env.GOOGLE_CLIENT_SECRET) faltam.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY) faltam.push("GOOGLE_TOKEN_ENCRYPTION_KEY");
  if (!adminConfigurado()) faltam.push("SUPABASE_SERVICE_ROLE_KEY");
  return faltam;
}

export function urlAutorizacao(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: urlRetorno(),
    response_type: "code",
    scope: ESCOPOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type Tokens = { access_token: string; expires_in: number; refresh_token?: string; scope: string };

async function pedirToken(corpo: Record<string, string>): Promise<Tokens> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...corpo,
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Google recusou o token (${r.status}): ${await r.text()}`);
  return r.json();
}

// Troca o código do retorno pelos tokens, descobre a conta e guarda o refresh token criptografado.
export async function concluirConexao(codigo: string, socioId: string): Promise<string> {
  const t = await pedirToken({ code: codigo, grant_type: "authorization_code", redirect_uri: urlRetorno() });
  if (!t.refresh_token) throw new Error("O Google não devolveu refresh token. Remova o acesso do app na conta Google e conecte de novo.");

  const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${t.access_token}` },
    cache: "no-store",
  }).then((r) => r.json() as Promise<{ email?: string }>);

  const admin = createAdminClient();
  const { error } = await admin.from("integracoes_google").upsert({
    id: 1,
    email: info.email ?? "conta sem e-mail",
    refresh_token_cifrado: cifrar(t.refresh_token),
    escopos: t.scope,
    conectado_por: socioId,
    conectado_em: new Date().toISOString(),
  });
  if (error) throw new Error(`Falha ao guardar a conexão: ${error.message}`);
  cache = { token: t.access_token, expira: Date.now() + (t.expires_in - 60) * 1000 };
  return info.email ?? "";
}

export type StatusGoogle =
  | { conectado: false; faltando: string[] }
  | { conectado: true; email: string; conectadoEm: string; conectadoPor: string | null };

export async function statusGoogle(): Promise<StatusGoogle> {
  const faltando = configuracaoFaltando();
  if (faltando.length) return { conectado: false, faltando };
  const { data } = await createAdminClient()
    .from("integracoes_google")
    .select("email, conectado_em, socio:profiles!integracoes_google_conectado_por_fkey(full_name, nickname)")
    .maybeSingle();
  if (!data) return { conectado: false, faltando: [] };
  return {
    conectado: true,
    email: data.email,
    conectadoEm: data.conectado_em,
    conectadoPor: data.socio ? (data.socio.nickname ?? data.socio.full_name) : null,
  };
}

// Access token em memória do processo, renovado pelo refresh token quando vence.
let cache: { token: string; expira: number } | null = null;

export async function tokenDeAcesso(): Promise<string | null> {
  if (cache && cache.expira > Date.now()) return cache.token;
  if (configuracaoFaltando().length) return null;
  const { data } = await createAdminClient().from("integracoes_google").select("refresh_token_cifrado").maybeSingle();
  if (!data) return null;
  const t = await pedirToken({ refresh_token: decifrar(data.refresh_token_cifrado), grant_type: "refresh_token" });
  cache = { token: t.access_token, expira: Date.now() + (t.expires_in - 60) * 1000 };
  return cache.token;
}

export async function desconectar(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin.from("integracoes_google").select("refresh_token_cifrado").maybeSingle();
  if (data) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decifrar(data.refresh_token_cifrado))}`, {
      method: "POST",
    }).catch(() => undefined);
  }
  await admin.from("integracoes_google").delete().eq("id", 1);
  cache = null;
}

// fetch autenticado nas APIs do Google. Lança erro com a resposta quando falha.
export async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = await tokenDeAcesso();
  if (!token) throw new Error("Google não conectado.");
  const r = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Google respondeu ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r;
}
