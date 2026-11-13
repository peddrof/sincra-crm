import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { Logo } from "@/components/Logo";
import { NavItens, NavPrincipal } from "@/components/NavPrincipal";
import { sair } from "@/lib/actions/sessao";
import { getSocio } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Área interna: tudo aqui exige sócio ativo. A moldura estática sai no shell;
// o que depende da sessão entra por <Suspense> (cacheComponents).
// Telas grandes: barra lateral fixa (marca no topo, navegação, sócio embaixo).
// Celular: a mesma barra vira cabeçalho (marca + sócio em cima, navegação rolando na horizontal embaixo).
export default function AreaInternaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <aside className="grid shrink-0 grid-cols-[1fr_auto] border-b border-linha bg-white lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:grid-cols-1 lg:grid-rows-[auto_1fr_auto] lg:border-r lg:border-b-0">
        <div className="col-start-1 row-start-1 flex h-14 items-center px-4 lg:h-auto lg:px-5 lg:pt-6 lg:pb-5">
          <Link href="/" aria-label="Início" className="shrink-0">
            <Logo />
          </Link>
        </div>
        <div className="col-span-2 row-start-2 overflow-x-auto px-2 pb-2 lg:col-span-1 lg:overflow-x-visible lg:overflow-y-auto lg:px-3 lg:pb-3">
          <Suspense fallback={<NavItens pathname={null} />}>
            <NavComContagem />
          </Suspense>
        </div>
        <div className="col-start-2 row-start-1 flex items-center px-4 lg:col-start-1 lg:row-start-3 lg:border-t lg:border-linha lg:p-3">
          <Suspense fallback={null}>
            <MenuSocio />
          </Suspense>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<Carregando />}>
          <SoSocios>{children}</SoSocios>
        </Suspense>
      </div>
    </div>
  );
}

// Menu com o número de atualizações não lidas do feed.
async function NavComContagem() {
  await getSocio();
  const supabase = await createClient();
  const { count } = await supabase.from("feed_eventos").select("id", { count: "exact", head: true }).eq("lido", false);
  return <NavPrincipal naoLidos={count ?? 0} />;
}

async function SoSocios({ children }: { children: React.ReactNode }) {
  await getSocio();
  return children;
}

async function MenuSocio() {
  const socio = await getSocio();
  const nome = socio.apelido ?? socio.nome;
  return (
    <div className="flex items-center gap-2 lg:w-full lg:flex-col lg:items-stretch lg:gap-1">
      <span className="hidden items-center gap-2.5 px-2 py-1.5 lg:flex">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-azul-50 text-sm font-semibold text-sincra-tinta">
          {nome.charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm leading-5 font-semibold text-tinta">{nome}</span>
          <span className="text-xs leading-4 text-cinza">Sócio</span>
        </span>
      </span>
      <span className="hidden text-sm leading-[22px] font-medium text-tinta-2 sm:inline lg:hidden">{nome}</span>
      <Link
        href="/configuracoes"
        className="rounded-full px-3 py-1.5 text-sm font-semibold text-tinta-3 hover:bg-superficie hover:text-tinta lg:rounded-campo lg:py-2"
      >
        Configurações
      </Link>
      <form action={sair} className="lg:flex">
        <button
          type="submit"
          className="h-9 rounded-full border border-linha bg-white px-4 text-sm font-semibold text-tinta transition-colors hover:bg-superficie lg:w-full lg:rounded-campo lg:border-transparent lg:px-3 lg:text-left lg:text-tinta-3 lg:hover:text-tinta"
        >
          Sair
        </button>
      </form>
    </div>
  );
}
