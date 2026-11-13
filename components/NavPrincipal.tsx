"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Ícones de traço (brandbook: ícone sempre acompanhado da palavra).
const ICONES: Record<string, React.ReactNode> = {
  "/": <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  "/feed": (
    <>
      <path d="M5 6h14M5 12h14M5 18h9" />
    </>
  ),
  "/negocios": (
    <>
      <rect x="4" y="4" width="4.5" height="16" rx="1" />
      <rect x="10" y="4" width="4.5" height="11" rx="1" />
      <rect x="16" y="4" width="4" height="7" rx="1" />
    </>
  ),
  "/organizacoes": (
    <>
      <path d="M5 20V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v15M15 10h3a1 1 0 0 1 1 1v9M3 20h18" />
      <path d="M8.5 8h3M8.5 12h3M8.5 16h3" />
    </>
  ),
  "/contatos": (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.8c1.6.6 2.7 2.2 3 4.7" />
    </>
  ),
  "/reunioes": (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  "/conexoes": (
    <>
      <circle cx="12" cy="12" r="2.5" />
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="6" cy="19" r="1.8" />
      <circle cx="18.5" cy="18" r="1.8" />
      <path d="m6.4 7.2 3.7 3.2M17.6 7.2l-3.7 3.2M7.3 17.8l2.8-3.9M17.1 16.8l-3.2-3" />
    </>
  ),
  "/tarefas": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </>
  ),
  "/documentos": (
    <>
      <path d="M14 3.5H7a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7.5z" />
      <path d="M14 3.5v4h4M9 12h6M9 16h4" />
    </>
  ),
};

const itens = [
  { href: "/", rotulo: "Início" },
  { href: "/feed", rotulo: "Feed" },
  { href: "/negocios", rotulo: "Negócios" },
  { href: "/organizacoes", rotulo: "Organizações" },
  { href: "/contatos", rotulo: "Contatos" },
  { href: "/reunioes", rotulo: "Reuniões" },
  { href: "/conexoes", rotulo: "Conexões" },
  { href: "/tarefas", rotulo: "Tarefas" },
  { href: "/documentos", rotulo: "Documentos" },
];

// Lê a rota atual para marcar o item ativo. Usar dentro de <Suspense> (usePathname com cacheComponents).
export function NavPrincipal({ naoLidos = 0 }: { naoLidos?: number }) {
  return <NavItens pathname={usePathname()} naoLidos={naoLidos} />;
}

// Parte visual, sem hooks: serve também de reserva enquanto o contador carrega.
// Barra lateral em telas grandes (lista vertical); no celular vira uma faixa que rola na horizontal.
export function NavItens({ pathname, naoLidos = 0 }: { pathname: string | null; naoLidos?: number }) {
  return (
    <nav aria-label="Principal" className="flex w-max items-center gap-1 lg:w-full lg:flex-col lg:items-stretch lg:gap-0.5">
      {itens.map((item) => {
        const ativo = pathname !== null && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
        const contador = item.href === "/feed" && naoLidos > 0 ? naoLidos : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            aria-label={contador ? `${item.rotulo}, ${contador} não lidas` : undefined}
            className={`inline-flex shrink-0 items-center gap-2.5 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors lg:rounded-campo lg:py-2.5 ${
              ativo ? "bg-sincra text-white shadow-cartao" : "text-tinta-3 hover:bg-azul-50 hover:text-sincra-tinta"
            }`}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="hidden size-[18px] shrink-0 lg:block"
            >
              {ICONES[item.href]}
            </svg>
            {item.rotulo}
            {contador > 0 && (
              <span
                className={`tabular min-w-5 rounded-full px-1.5 text-center text-xs leading-5 font-semibold lg:ml-auto ${
                  ativo ? "bg-white text-sincra-tinta" : "bg-sincra text-white"
                }`}
              >
                {contador > 99 ? "99+" : contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
