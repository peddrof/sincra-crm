import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./env";

// Rotas abertas a quem não está logado.
function rotaPublica(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

// Renova o token de sessão do Supabase em toda requisição e manda para /login quem não tem sessão.
// Aqui só se confere a sessão; se a pessoa é sócia ativa, quem confere é lib/auth.ts (getSocio), perto dos dados.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!supabaseConfigured) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Não colocar código entre a criação do cliente e esta chamada: ela é o que renova a sessão.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!logado && !rotaPublica(pathname)) return redirecionar(request, response, "/login");
  if (logado && pathname === "/login") return redirecionar(request, response, "/");

  return response;
}

// Redireciona levando junto os cookies de sessão que o Supabase acabou de renovar.
function redirecionar(request: NextRequest, base: NextResponse, destino: string) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  const cacheControl = base.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}
