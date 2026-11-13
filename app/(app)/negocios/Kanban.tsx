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
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { moverNegocio } from "@/lib/actions/negocios";

export type EtapaKanban = { id: string; nome: string; fechada: boolean; chave: string };
export type CartaoNegocio = {
  id: string;
  titulo: string;
  organizacao: string;
  responsavel: string;
  etapaId: string;
  valor: string;
  taxa: string;
  pedirDocumentos: boolean;
  organizacaoId: string;
};

// Kanban de um funil. Arrastar o cartão para outra coluna muda a etapa (o banco grava o evento no feed).
// O arraste só começa depois de 6 px, para o clique no nome continuar abrindo o negócio.
export function Kanban({ etapas, negocios }: { etapas: EtapaKanban[]; negocios: CartaoNegocio[] }) {
  const [cartoes, setCartoes] = useState(negocios);
  const [base, setBase] = useState(negocios);
  const [ativo, setAtivo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  // ID estável entre servidor e navegador (evita diferença de hidratação nos atributos de acessibilidade).
  const idDnd = useId();
  // Dados novos do servidor (após mover ou recarregar) substituem o estado local.
  if (base !== negocios) {
    setBase(negocios);
    setCartoes(negocios);
  }

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function soltar(e: DragEndEvent) {
    setAtivo(null);
    const id = String(e.active.id);
    const etapaId = e.over ? String(e.over.id) : null;
    const anterior = cartoes.find((c) => c.id === id);
    if (!anterior || !etapaId || anterior.etapaId === etapaId) return;
    setErro(null);
    setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, etapaId } : c)));
    iniciar(async () => {
      const r = await moverNegocio(id, etapaId);
      if (r.erro) {
        setErro(r.erro);
        setCartoes((cs) => cs.map((c) => (c.id === id ? { ...c, etapaId: anterior.etapaId } : c)));
      }
    });
  }

  const cartaoAtivo = cartoes.find((c) => c.id === ativo);

  return (
    <div className="flex flex-col gap-3">
      {erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {erro}
        </p>
      )}
      <DndContext id={idDnd} sensors={sensores} onDragStart={(e) => setAtivo(String(e.active.id))} onDragCancel={() => setAtivo(null)} onDragEnd={soltar}>
        <div className="overflow-x-auto pb-3">
          <div className="flex min-w-max gap-3">
            {etapas.map((etapa) => (
              <Coluna key={etapa.id} etapa={etapa} cartoes={cartoes.filter((c) => c.etapaId === etapa.id)} ativo={ativo} />
            ))}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>{cartaoAtivo ? <Cartao n={cartaoAtivo} flutuando /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function Coluna({ etapa, cartoes, ativo }: { etapa: EtapaKanban; cartoes: CartaoNegocio[]; ativo: string | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa.id });
  const perdido = etapa.chave === "perdido";
  const ganho = etapa.fechada && !perdido;
  return (
    <section
      ref={setNodeRef}
      aria-label={etapa.nome}
      className={`flex w-72 shrink-0 flex-col gap-2 rounded-cartao border-2 p-2.5 transition-colors ${
        isOver ? "border-dashed border-sincra bg-azul-50" : perdido ? "border-transparent bg-superficie" : "border-transparent bg-azul-25"
      }`}
    >
      <header
        className={`flex items-center justify-between rounded-campo px-3 py-2 ${
          ganho ? "bg-ok-bg" : perdido ? "bg-white" : "bg-azul-50"
        }`}
      >
        <h2 className={`text-sm leading-[22px] font-semibold ${ganho ? "text-ok" : perdido ? "text-tinta-3" : "text-sincra-tinta"}`}>
          {etapa.nome}
        </h2>
        <span
          className={`tabular min-w-6 rounded-full px-2 text-center text-xs leading-5 font-semibold ${
            ganho ? "bg-ok text-white" : perdido ? "bg-linha text-tinta-3" : "bg-sincra text-white"
          }`}
        >
          {cartoes.length}
        </span>
      </header>
      {cartoes.length === 0 && (
        <p className="rounded-campo border border-dashed border-azul-200 px-3 py-5 text-center text-xs text-cinza">Solte um negócio aqui</p>
      )}
      {cartoes.map((n) => (
        <CartaoArrastavel key={n.id} n={n} escondido={ativo === n.id} />
      ))}
    </section>
  );
}

function CartaoArrastavel({ n, escondido }: { n: CartaoNegocio; escondido: boolean }) {
  const { setNodeRef, attributes, listeners } = useDraggable({ id: n.id });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className={`touch-none ${escondido ? "opacity-30" : ""}`}>
      <Cartao n={n} />
    </div>
  );
}

function Cartao({ n, flutuando = false }: { n: CartaoNegocio; flutuando?: boolean }) {
  return (
    <article
      className={`flex cursor-grab flex-col gap-1.5 rounded-campo border border-l-4 border-linha border-l-sincra bg-white p-3 active:cursor-grabbing ${
        flutuando ? "rotate-2 shadow-destaque" : "shadow-cartao hover:border-azul-200 hover:border-l-sincra"
      }`}
    >
      <Link href={`/negocios/${n.id}`} className="text-sm leading-5 font-semibold text-tinta hover:text-sincra-tinta">
        {n.titulo}
      </Link>
      <span className="text-xs leading-4 text-tinta-3">{n.organizacao}</span>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-0.5 text-xs leading-4">
        <span className="rounded-full bg-azul-50 px-2 py-0.5 font-semibold text-sincra-tinta">{n.responsavel}</span>
        {(n.valor || n.taxa) && (
          <span className="tabular text-cinza">
            {n.valor && (
              <>
                R$ <span className="font-semibold text-tinta">{n.valor}</span>
              </>
            )}
            {n.valor && n.taxa && " · "}
            {n.taxa}
          </span>
        )}
      </div>
      {n.pedirDocumentos && (
        <Link
          href={`/organizacoes/${n.organizacaoId}/documentos/nova?negocio=${n.id}`}
          className="text-xs font-semibold text-sincra-tinta"
        >
          Abrir lista de documentos
        </Link>
      )}
    </article>
  );
}
