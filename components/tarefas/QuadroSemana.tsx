"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useActionState, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { criarTarefa, moverTarefa, mudarAndamento, type EstadoTarefa } from "@/lib/actions/tarefas";
import { ANDAMENTOS, ddmm, rotuloDia, somarDias, type Andamento } from "@/lib/tarefas";
import { Cartao, IconeAndamento, type CartaoTarefa } from "./CartaoTarefa";
import { PainelTarefa } from "./PainelTarefa";

export type { CartaoTarefa } from "./CartaoTarefa";

const PESO_PRIORIDADE = { urgente: 0, importante: 1, normal: 2, baixa: 3 } as const;
const ordenar = (a: CartaoTarefa, b: CartaoTarefa) =>
  Number(a.andamento === "concluida") - Number(b.andamento === "concluida") ||
  PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade] ||
  a.titulo.localeCompare(b.titulo);

const CHAVE_COMPACTO = "sincra.tarefas.compacto";
function lerPreferencia() {
  try {
    return localStorage.getItem(CHAVE_COMPACTO) !== "0";
  } catch {
    return true;
  }
}
function assinarPreferencia(avisar: () => void) {
  window.addEventListener("storage", avisar);
  return () => window.removeEventListener("storage", avisar);
}

// Quadro de tarefas. Visão "semana": colunas por dia (arrastar muda a entrega) e, embaixo, A agendar,
// Atrasadas e Próxima semana. Visão "status": colunas por andamento (arrastar muda o andamento).
// Qualquer sócio arrasta; clicar abre o cartão (modo compacto) ou o painel da tarefa.
export function QuadroSemana({
  visao,
  segunda,
  hoje,
  cartoes: iniciais,
  eu,
  paraQuem,
  destaque,
}: {
  visao: "semana" | "status";
  segunda: string;
  hoje: string;
  cartoes: CartaoTarefa[];
  eu: string;
  paraQuem: string;
  destaque: string | null;
}) {
  const [cartoes, setCartoes] = useState(iniciais);
  const [base, setBase] = useState(iniciais);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [painel, setPainel] = useState<string | null>(destaque);
  // Preferência compacto/aberto fica no navegador de cada sócio (se o navegador bloquear, vale só nesta visita).
  const guardado = useSyncExternalStore(assinarPreferencia, lerPreferencia, () => true);
  const [escolha, setEscolha] = useState<boolean | null>(null);
  const compacto = escolha ?? guardado;
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [, iniciar] = useTransition();
  const idDnd = useId();
  if (base !== iniciais) {
    setBase(iniciais);
    setCartoes(iniciais);
  }

  const trocarCompacto = (v: boolean) => {
    setEscolha(v);
    setAbertos(new Set());
    try {
      localStorage.setItem(CHAVE_COMPACTO, v ? "1" : "0");
    } catch {}
  };

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const dias = Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
  const domingo = dias[6];
  const proximaSegunda = somarDias(segunda, 7);

  const colunaDe = (c: CartaoTarefa): string => {
    if (visao === "status") return `s:${c.andamento}`;
    if (!c.dia) return "agendar";
    if (c.dia < segunda) return "atrasadas";
    if (c.dia > domingo) return "proxima";
    return `d:${c.dia}`;
  };

  function soltar(e: DragEndEvent) {
    setAtivo(null);
    const id = String(e.active.id);
    const destino = e.over ? String(e.over.id) : null;
    const anterior = cartoes.find((c) => c.id === id);
    if (!anterior || !destino || destino === "atrasadas" || destino === colunaDe(anterior)) return;
    setErro(null);

    if (destino.startsWith("s:")) {
      const andamento = destino.slice(2) as Andamento;
      setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, andamento } : c)));
      iniciar(async () => {
        const r = await mudarAndamento(id, andamento);
        if (r.erro) {
          setErro(r.erro);
          setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, andamento: anterior.andamento } : c)));
        }
      });
      return;
    }

    const novoDia = destino === "agendar" ? null : destino === "proxima" ? proximaSegunda : destino.slice(2);
    setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, dia: novoDia } : c)));
    iniciar(async () => {
      const r = await moverTarefa(id, novoDia);
      if (r.erro) {
        setErro(r.erro);
        setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, dia: anterior.dia } : c)));
      }
    });
  }

  // Concluir/reabrir pelo ícone do cartão, sem abrir o painel. Reabrir volta para "Em andamento".
  const concluir = (c: CartaoTarefa) => {
    const anterior = c.andamento;
    const novo: Andamento = anterior === "concluida" ? "em_andamento" : "concluida";
    setErro(null);
    setCartoes((cs) => cs.map((x) => (x.id === c.id ? { ...x, andamento: novo } : x)));
    iniciar(async () => {
      const r = await mudarAndamento(c.id, novo);
      if (r.erro) {
        setErro(r.erro);
        setCartoes((cs) => cs.map((x) => (x.id === c.id ? { ...x, andamento: anterior } : x)));
      }
    });
  };

  const clicar = (id: string) => {
    if (compacto && !abertos.has(id)) setAbertos((s) => new Set(s).add(id));
    else setPainel(id);
  };

  // Igual ao funil de Negócios: qualquer sócio arrasta qualquer cartão (concluída só sai pela visão Andamento).
  const podeArrastar = (c: CartaoTarefa) => visao === "status" || c.andamento !== "concluida";

  const lista = (coluna: string) => cartoes.filter((c) => colunaDe(c) === coluna).sort(ordenar);
  const cartoesDe = (coluna: string, grade = false) => {
    const itens = lista(coluna);
    return (
      <div className={grade ? "grid gap-2 sm:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
        {itens.map((c) => (
          <CartaoArrastavel
            key={c.id}
            c={c}
            hoje={hoje}
            compacto={compacto && !abertos.has(c.id)}
            escondido={ativo === c.id}
            destaque={destaque === c.id}
            arrastavel={podeArrastar(c)}
            aoClicar={() => clicar(c.id)}
            aoConcluir={() => concluir(c)}
          />
        ))}
      </div>
    );
  };

  const cartaoAtivo = cartoes.find((c) => c.id === ativo);
  const cartaoPainel = cartoes.find((c) => c.id === painel);
  const atrasadas = visao === "semana" ? lista("atrasadas") : [];

  // Tarefa de vários dias: faixa nos dias entre o início e a véspera da entrega.
  const faixasDo = (dia: string) =>
    cartoes.filter((c) => c.andamento !== "concluida" && c.inicio && c.dia && c.inicio <= dia && dia < c.dia);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {erro ? (
          <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
            {erro}
          </p>
        ) : (
          <span className="text-sm text-cinza">
            {compacto
              ? "Clique no círculo para concluir. Clique no cartão para abrir; de novo, para os detalhes."
              : "Clique no círculo para concluir. Clique no cartão para ver os detalhes."}
          </span>
        )}
        <div className="flex items-center gap-1 rounded-full bg-superficie p-1 text-sm font-semibold" role="group" aria-label="Tamanho dos cartões">
          {[
            { v: true, r: "Compactos" },
            { v: false, r: "Abertos" },
          ].map((o) => (
            <button
              key={o.r}
              type="button"
              aria-pressed={compacto === o.v}
              onClick={() => trocarCompacto(o.v)}
              className={`rounded-full px-3 py-1.5 ${compacto === o.v ? "bg-white text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta"}`}
            >
              {o.r}
            </button>
          ))}
        </div>
      </div>

      <DndContext
        id={idDnd}
        sensors={sensores}
        onDragStart={(e) => {
          setErro(null);
          setAtivo(String(e.active.id));
        }}
        onDragCancel={() => setAtivo(null)}
        onDragEnd={soltar}
      >
        {visao === "semana" ? (
          <>
            <div className="overflow-x-auto pb-1">
              <div className="grid min-w-[980px] grid-cols-7 gap-2">
                {dias.map((d) => (
                  <Coluna
                    key={d}
                    id={`d:${d}`}
                    titulo={rotuloDia(d)}
                    contagem={lista(`d:${d}`).filter((c) => c.andamento !== "concluida").length}
                    hoje={d === hoje}
                    passado={d < hoje}
                    acao={<AdicionarNoDia dia={d} paraQuem={paraQuem} eu={eu} />}
                  >
                    {faixasDo(d).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPainel(c.id)}
                        title={`${c.titulo}: de ${ddmm(c.inicio!)} a ${ddmm(c.dia!)}`}
                        className="flex items-center gap-1 truncate rounded-md border border-dashed border-azul-200 bg-white/70 px-2 py-1 text-left text-[11px] leading-4 text-sincra-tinta hover:bg-white"
                      >
                        <IconeAndamento andamento={c.andamento} className="size-3!" />
                        <span className="truncate">
                          {c.titulo} · até {rotuloDia(c.dia!).slice(0, 3)}
                        </span>
                      </button>
                    ))}
                    {cartoesDe(`d:${d}`)}
                  </Coluna>
                ))}
              </div>
            </div>

            <div className={`grid gap-3 ${atrasadas.length ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
              <Coluna id="agendar" titulo="A agendar" contagem={lista("agendar").length} ajuda="Pedidos e tarefas sem dia. Arraste para um dia da semana." larga>
                {cartoesDe("agendar", !atrasadas.length)}
              </Coluna>
              {atrasadas.length > 0 && (
                <Coluna id="atrasadas" titulo="Atrasadas" contagem={atrasadas.length} ajuda="De semanas anteriores." critica larga soltavel={false}>
                  {cartoesDe("atrasadas")}
                </Coluna>
              )}
              <Coluna
                id="proxima"
                titulo="Próxima semana"
                contagem={lista("proxima").filter((c) => c.andamento !== "concluida").length}
                ajuda={`Solte aqui para mandar para ${rotuloDia(proximaSegunda)}.`}
                larga
              >
                {cartoesDe("proxima", !atrasadas.length)}
              </Coluna>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[900px] grid-cols-4 gap-3">
              {ANDAMENTOS.map((a) => (
                <Coluna
                  key={a.valor}
                  id={`s:${a.valor}`}
                  titulo={a.rotulo}
                  icone={<IconeAndamento andamento={a.valor} />}
                  contagem={lista(`s:${a.valor}`).length}
                  ajuda={a.valor === "concluida" ? "Concluídas nos últimos 30 dias." : undefined}
                >
                  {cartoesDe(`s:${a.valor}`)}
                </Coluna>
              ))}
            </div>
          </div>
        )}
        <DragOverlay dropAnimation={null}>
          {cartaoAtivo ? <Cartao c={cartaoAtivo} hoje={hoje} compacto={compacto && !abertos.has(cartaoAtivo.id)} flutuando /> : null}
        </DragOverlay>
      </DndContext>

      {cartaoPainel && <PainelTarefa key={cartaoPainel.id} c={cartaoPainel} eu={eu} aoFechar={() => setPainel(null)} />}
    </div>
  );
}

function Coluna({
  id,
  titulo,
  contagem,
  children,
  icone,
  acao,
  ajuda,
  hoje = false,
  passado = false,
  critica = false,
  larga = false,
  soltavel = true,
}: {
  id: string;
  titulo: string;
  contagem: number;
  children: ReactNode;
  icone?: ReactNode;
  acao?: ReactNode;
  ajuda?: string;
  hoje?: boolean;
  passado?: boolean;
  critica?: boolean;
  larga?: boolean;
  soltavel?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !soltavel });
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (hoje) ref.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [hoje]);
  return (
    <section
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      aria-label={titulo}
      className={`flex min-w-0 flex-col gap-2 rounded-xl border p-2 transition-colors ${larga ? "min-h-24" : "min-h-64"} ${
        isOver
          ? "border-dashed border-sincra bg-azul-50"
          : hoje
            ? "border-sincra/40 bg-azul-25"
            : critica
              ? "border-critico/20 bg-critico-bg/50"
              : "border-linha bg-superficie/60"
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <h2
          className={`flex min-w-0 items-center gap-1.5 text-sm leading-[22px] font-semibold ${
            hoje ? "text-sincra-tinta" : critica ? "text-critico" : passado ? "text-tinta-3" : "text-tinta"
          }`}
        >
          {icone}
          <span className="truncate">{titulo}</span>
          {hoje && <span className="rounded-full bg-sincra px-1.5 text-[10px] leading-4 font-semibold text-white">hoje</span>}
          <span className="tabular text-xs font-medium text-cinza">{contagem}</span>
        </h2>
        {acao}
      </header>
      {ajuda && contagem === 0 && <p className="px-1.5 text-xs leading-4 text-cinza">{ajuda}</p>}
      {children}
    </section>
  );
}

function CartaoArrastavel({
  c,
  hoje,
  compacto,
  escondido,
  destaque,
  arrastavel,
  aoClicar,
  aoConcluir,
}: {
  c: CartaoTarefa;
  hoje: string;
  compacto: boolean;
  escondido: boolean;
  destaque: boolean;
  arrastavel: boolean;
  aoClicar: () => void;
  aoConcluir: () => void;
}) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: c.id, disabled: !arrastavel });
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (destaque) ref.current?.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  }, [destaque]);
  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      {...attributes}
      {...listeners}
      className={`touch-none ${escondido ? "opacity-30" : ""}`}
    >
      <Cartao c={c} hoje={hoje} compacto={compacto} destaque={destaque} arrastavel={arrastavel} aoClicar={aoClicar} aoConcluir={aoConcluir} />
    </div>
  );
}

// "+" no cabeçalho de cada dia: tarefa para quem está sendo visto (ou para mim, em "Todos").
// Se for para outro sócio, vira pedido com esse dia como data pedida.
function AdicionarNoDia({ dia, paraQuem, eu }: { dia: string; paraQuem: string; eu: string }) {
  const [aberto, setAberto] = useState(false);
  const [estado, acao, pendente] = useActionState<EstadoTarefa, FormData>(criarTarefa, {});
  const [ultimo, setUltimo] = useState(0);
  if ((estado.ok ?? 0) !== ultimo) {
    setUltimo(estado.ok ?? 0);
    setAberto(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={`Adicionar tarefa em ${rotuloDia(dia)}`}
        className="flex size-6 items-center justify-center rounded-md text-base leading-none text-tinta-3 hover:bg-white hover:text-sincra-tinta"
      >
        +
      </button>
      {aberto && (
        <form action={acao} className="absolute top-8 right-0 z-20 flex w-60 flex-col gap-1.5 rounded-xl border border-linha bg-white p-2.5 shadow-destaque">
          <input type="hidden" name="due_date" value={dia} />
          <input type="hidden" name="assignee_id" value={paraQuem} />
          <span className="text-xs font-semibold text-tinta-2">{paraQuem === eu ? rotuloDia(dia) : `Pedido para ${rotuloDia(dia)}`}</span>
          <textarea
            name="title"
            required
            maxLength={300}
            autoFocus
            rows={2}
            placeholder="O que fazer?"
            aria-label="Nova tarefa"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
              if (e.key === "Escape") setAberto(false);
            }}
            className="w-full resize-none rounded-md border border-linha px-2 py-1.5 text-sm leading-5 text-tinta outline-none focus:border-sincra"
          />
          {estado.erro && <p className="text-xs text-critico">{estado.erro}</p>}
          <div className="flex items-center gap-2">
            <button type="submit" disabled={pendente} className="rounded-md bg-sincra px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60">
              {pendente ? "Salvando…" : paraQuem === eu ? "Adicionar" : "Pedir"}
            </button>
            <button type="button" onClick={() => setAberto(false)} className="text-xs font-semibold text-tinta-3">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
