import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { accessConfigurado, emailDoAccess } from "@/lib/cloudflare-access";
import { supabaseConfigured, supabaseKey, supabaseUrl } from "./env";

// Rotas abertas a quem não está logado.
function rotaPublica(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/auth/");
}

// Renova o token de sessão do Supabase em toda requisição e manda para /login quem não tem sessão.
// Aqui só se confere a sessão; se a pessoa é sócia ativa, quem confere é lib/auth.ts (getSocio), perto dos dados.
export async function updateSession(request: NextRequest) {
  // Com o Cloudflare Access configurado (publicação), toda requisição precisa trazer o token válido da Cloudflare.
  // Quem chega direto na Vercel (sem passar pelo gestao.sincra.app) é barrado aqui.
  const emailAccess = accessConfigurado ? await emailDoAccess(request) : null;
  if (accessConfigurado && !emailAccess) {
    return new NextResponse("Acesso só por gestao.sincra.app.", { status: 403 });
  }

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
  const { pathname, search } = request.nextUrl;

  if (accessConfigurado && !rotaPublica(pathname)) {
    // Login único: sem sessão, ou com sessão de outro e-mail, abre a sessão do e-mail que a Cloudflare autenticou.
    const emailSessao = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
    if (!logado || emailSessao !== emailAccess) {
      return redirecionar(request, response, "/auth/cloudflare", { proximo: pathname + search });
    }
  }

  if (!logado && !rotaPublica(pathname)) return redirecionar(request, response, "/login");
  if (logado && pathname === "/login") return redirecionar(request, response, "/");

  return response;
}

// Redireciona levando junto os cookies de sessão que o Supabase acabou de renovar.
function redirecionar(request: NextRequest, base: NextResponse, destino: string, busca?: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = busca ? new URLSearchParams(busca).toString() : "";
  const redirect = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  const cacheControl = base.headers.get("cache-control");
  if (cacheControl) redirect.headers.set("cache-control", cacheControl);
  return redirect;
}
