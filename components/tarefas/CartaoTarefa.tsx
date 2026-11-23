"use client";

import { ddmm, diasEntre, rotuloDia, type Andamento, type PrioridadeTarefa } from "@/lib/tarefas";

export type Etapa = { id: string; titulo: string; feita: boolean };

export type CartaoTarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  andamento: Andamento;
  prioridade: PrioridadeTarefa;
  dia: string | null; // entrega (coluna do quadro)
  inicio: string | null; // tarefa de vários dias
  dataPedida: string | null;
  criadaEm: string;
  responsavelId: string | null;
  responsavel: string;
  pedidoPor: string | null;
  criadorId: string | null;
  cor: number;
  contexto: { rotulo: string; href: string } | null;
  etapas: Etapa[];
};

// ——— Ícones (traço 1.6, 14 px), no espírito do design de referência ———

export function IconeAndamento({ andamento, className = "" }: { andamento: Andamento; className?: string }) {
  if (andamento === "concluida") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 ${className}`}>
        <rect x="1.5" y="1.5" width="13" height="13" rx="4" className="fill-ok" />
        <path d="M5 8.2 7 10.2 11 6" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (andamento === "em_andamento") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 ${className}`}>
        <circle cx="8" cy="8" r="6.2" fill="none" className="stroke-sincra" strokeWidth="1.6" />
        <path d="M8 3.6a4.4 4.4 0 0 1 0 8.8Z" className="fill-sincra" />
      </svg>
    );
  }
  if (andamento === "pausada") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 ${className}`}>
        <circle cx="8" cy="8" r="6.2" fill="none" className="stroke-atencao" strokeWidth="1.6" />
        <path d="M6.4 5.6v4.8M9.6 5.6v4.8" className="stroke-atencao" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 ${className}`}>
      <circle cx="8" cy="8" r="6.2" fill="none" className="stroke-cinza-3" strokeWidth="1.6" strokeDasharray="2.4 2" />
    </svg>
  );
}

const COR_PRIORIDADE: Record<PrioridadeTarefa, { barras: number; classe: string; rotulo: string }> = {
  urgente: { barras: 3, classe: "fill-critico", rotulo: "Urgente" },
  importante: { barras: 3, classe: "fill-atencao", rotulo: "Importante" },
  normal: { barras: 2, classe: "fill-sincra", rotulo: "Normal" },
  baixa: { barras: 1, classe: "fill-ok", rotulo: "Baixa" },
};

export function IconePrioridade({ prioridade }: { prioridade: PrioridadeTarefa }) {
  const p = COR_PRIORIDADE[prioridade];
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1.5 + i * 4} y={9 - i * 3} width="3" height={4 + i * 3} rx="0.8" className={i < p.barras ? p.classe : "fill-linha"} />
      ))}
    </svg>
  );
}

function IconePessoa() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0 fill-cinza">
      <circle cx="7" cy="4.6" r="2.6" />
      <path d="M2 12.5c.4-2.6 2.5-4 5-4s4.6 1.4 5 4z" />
    </svg>
  );
}

function IconeCalendario() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0 fill-cinza">
      <rect x="1.5" y="2.5" width="11" height="10" rx="2" />
      <rect x="1.5" y="2.5" width="11" height="3" rx="1.5" className="fill-cinza-2" />
    </svg>
  );
}

function IconeEtapas() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className="size-3.5 shrink-0 fill-none stroke-cinza" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 3.5h1M2 7h1M2 10.5h1M5.5 3.5h6.5M5.5 7h6.5M5.5 10.5h6.5" />
    </svg>
  );
}

export const rotuloPrioridade = (p: PrioridadeTarefa) => COR_PRIORIDADE[p].rotulo;

const chipBase = "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs leading-4 font-medium";
const classeChip = `${chipBase} border-linha bg-white text-tinta-2`;

// Rótulo da data: "Sex 14/11" ou, com início, "10/11 → 14/11".
export function rotuloPeriodo(c: Pick<CartaoTarefa, "inicio" | "dia">) {
  if (!c.dia) return null;
  if (c.inicio && c.inicio !== c.dia) return `${ddmm(c.inicio)} → ${ddmm(c.dia)}`;
  return rotuloDia(c.dia);
}

// Cartão no padrão do design de referência: título + meta em cima, linha divisória, chips embaixo.
// compacto = só a linha do título (abre ao clicar).
export function Cartao({
  c,
  hoje,
  compacto,
  flutuando = false,
  destaque = false,
  arrastavel = true,
  aoClicar,
  aoConcluir,
}: {
  c: CartaoTarefa;
  hoje: string;
  compacto: boolean;
  flutuando?: boolean;
  destaque?: boolean;
  arrastavel?: boolean;
  aoClicar?: () => void;
  /** Concluir ou reabrir direto no cartão, sem abrir o painel. */
  aoConcluir?: () => void;
}) {
  const concluida = c.andamento === "concluida";
  const atrasada = !concluida && c.dia !== null && c.dia < hoje;
  const depoisDoPedido = !concluida && c.dia && c.dataPedida && c.dia > c.dataPedida;
  const feitas = c.etapas.filter((e) => e.feita).length;
  const periodo = rotuloPeriodo(c);
  const dias = c.inicio && c.dia ? diasEntre(c.inicio, c.dia) : 1;

  return (
    <article
      onClick={aoClicar}
      className={`group flex flex-col rounded-xl border bg-white text-left transition-shadow ${
        destaque ? "border-sincra ring-2 ring-sincra/30" : "border-linha"
      } ${flutuando ? "rotate-2 shadow-destaque" : "shadow-cartao hover:shadow-destaque"} ${
        arrastavel && !concluida ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      } ${concluida ? "opacity-75" : ""}`}
    >
      <div className={`flex flex-col gap-0.5 ${compacto ? "px-2.5 py-2" : "px-3 pt-2.5 pb-2"}`}>
        <div className="flex items-start gap-1.5">
          {aoConcluir ? (
            <button
              type="button"
              aria-label={concluida ? `Reabrir: ${c.titulo}` : `Concluir: ${c.titulo}`}
              title={concluida ? "Reabrir" : "Concluir"}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                aoConcluir();
              }}
              className="group/concluir -m-1 mt-[-2px] shrink-0 rounded-full p-1 hover:bg-ok-bg focus-visible:outline-2 focus-visible:outline-sincra"
            >
              <span className={concluida ? "" : "group-hover/concluir:hidden group-focus-visible/concluir:hidden"}>
                <IconeAndamento andamento={c.andamento} />
              </span>
              {!concluida && (
                <span className="hidden group-hover/concluir:block group-focus-visible/concluir:block">
                  <IconeAndamento andamento="concluida" />
                </span>
              )}
            </button>
          ) : (
            <IconeAndamento andamento={c.andamento} className="mt-0.5" />
          )}
          <span
            className={`min-w-0 flex-1 text-sm leading-5 font-medium break-words ${concluida ? "text-cinza line-through" : "text-tinta"} ${
              compacto ? "line-clamp-2" : ""
            }`}
          >
            {c.titulo}
          </span>
          {compacto && <IconePrioridade prioridade={c.prioridade} />}
        </div>
        {compacto ? (
          <span className="flex items-center gap-1.5 pl-5.5 text-[11px] leading-4 text-cinza">
            <span className="font-semibold text-tinta-2">{c.responsavel}</span>
            {c.etapas.length > 0 && <span className="tabular">· {feitas}/{c.etapas.length}</span>}
            {dias > 1 && <span>· {dias} dias</span>}
            {atrasada && <span className="font-semibold text-critico">· Atrasada</span>}
          </span>
        ) : (
          <span className="pl-5.5 text-xs leading-4 text-cinza">
            Criada {ddmm(c.criadaEm)}
            {c.pedidoPor && <> · pedido por {c.pedidoPor}</>}
          </span>
        )}
      </div>

      {!compacto && (
        <div className="flex flex-col gap-2 border-t border-linha px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={classeChip}>
              <IconePrioridade prioridade={c.prioridade} />
              {rotuloPrioridade(c.prioridade)}
            </span>
            <span className={classeChip}>
              <IconePessoa />
              {c.responsavel}
            </span>
            {periodo && (
              <span className={`${classeChip} tabular`}>
                <IconeCalendario />
                {periodo}
              </span>
            )}
            {atrasada && <span className={`${chipBase} border-critico/30 bg-critico-bg text-critico`}>Atrasada</span>}
            {c.dataPedida && (
              <span className={`${chipBase} tabular ${depoisDoPedido ? "border-atencao/40 bg-atencao-bg text-atencao" : "border-linha bg-white text-tinta-2"}`}>
                {depoisDoPedido ? "pedido era p/ " : "pedido p/ "}
                {rotuloDia(c.dataPedida)}
              </span>
            )}
            {c.etapas.length > 0 && (
              <span className={`${classeChip} tabular`}>
                <IconeEtapas />
                {feitas}/{c.etapas.length}
              </span>
            )}
          </div>
          {c.etapas.length > 0 && (
            <div className="h-1 overflow-hidden rounded-full bg-superficie" aria-hidden>
              <div className="h-full rounded-full bg-ok" style={{ width: `${(feitas / c.etapas.length) * 100}%` }} />
            </div>
          )}
          {!c.dia && c.pedidoPor && !concluida && (
            <span className="text-[11px] leading-4 text-tinta-3">Aguardando {c.responsavel} escolher o dia</span>
          )}
          {c.contexto && <span className="truncate text-[11px] leading-4 font-semibold text-sincra-tinta">{c.contexto.rotulo}</span>}
        </div>
      )}
    </article>
  );
}
