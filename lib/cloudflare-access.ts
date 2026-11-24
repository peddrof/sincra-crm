import { createRemoteJWKSet, jwtVerify } from "jose";

// Cloudflare Zero Trust (Access) na frente de gestao.sincra.app (decisão #24, 23/11/2026).
// A Cloudflare autentica com o Google e manda um JWT assinado em cada requisição (cabeçalho
// `Cf-Access-Jwt-Assertion` e cookie `CF_Authorization`). Aqui ele é conferido na origem: sem isso, quem
// chamasse a Vercel direto, sem passar pela Cloudflare, pularia o Access.
// Sem CF_ACCESS_TEAM_DOMAIN e CF_ACCESS_AUD (ex.: rodando no PC), nada disso é exigido e vale o login por senha.

const equipe = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/$/, "");
const aud = process.env.CF_ACCESS_AUD;

export const accessConfigurado = Boolean(equipe && aud);

// Logout do Access no próprio domínio (a Cloudflare intercepta /cdn-cgi/access/logout).
export const LOGOUT_ACCESS = "/cdn-cgi/access/logout";

let chaves: ReturnType<typeof createRemoteJWKSet> | null = null;

type ComCabecalhos = { headers: Headers; cookies: { get(nome: string): { value: string } | undefined } };

// E-mail do sócio autenticado pela Cloudflare, em minúsculas, ou null se o token faltar ou não for válido.
export async function emailDoAccess(request: ComCabecalhos): Promise<string | null> {
  if (!accessConfigurado) return null;
  const token = request.headers.get("cf-access-jwt-assertion") ?? request.cookies.get("CF_Authorization")?.value;
  if (!token) return null;

  chaves ??= createRemoteJWKSet(new URL(`https://${equipe}/cdn-cgi/access/certs`));
  try {
    const { payload } = await jwtVerify(token, chaves, { issuer: `https://${equipe}`, audience: aud });
    return typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}
