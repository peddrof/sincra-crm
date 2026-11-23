"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { classeBotaoPrimario, classeCampo } from "@/components/campos";
import {
  adicionarEtapa,
  alternarEtapa,
  moverParaLixeira,
  mudarAndamento,
  removerEtapa,
  salvarDetalhesTarefa,
  type EstadoTarefa,
} from "@/lib/actions/tarefas";
import { ANDAMENTOS, ddmm, PRIORIDADES_TAREFA, rotuloDia, type Andamento } from "@/lib/tarefas";
import { IconeAndamento, type CartaoTarefa } from "./CartaoTarefa";

// Painel lateral da tarefa: andamento, dados, período, etapas e lixeira.
export function PainelTarefa({ c, eu, aoFechar }: { c: CartaoTarefa; eu: string; aoFechar: () => void }) {
  const podeLixeira = c.responsavelId === null || c.responsavelId === eu || c.criadorId === eu;
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [estado, acao, salvando] = useActionState<EstadoTarefa, FormData>(salvarDetalhesTarefa, {});
  const [novaEtapa, setNovaEtapa] = useState("");

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aoFechar]);

  const rodar = (fn: () => Promise<{ erro?: string }>, depois?: () => void) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (r.erro) setErro(r.erro);
      else depois?.();
    });

  const feitas = c.etapas.filter((e) => e.feita).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={c.titulo}>
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 bg-tinta/20" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-destaque">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-linha bg-white px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs text-cinza">
              {c.responsavel}
              {c.pedidoPor && <> · pedido por {c.pedidoPor}</>} · criada {ddmm(c.criadaEm)}
            </span>
            <h2 className="text-lg leading-6 font-semibold break-words text-tinta">{c.titulo}</h2>
          </div>
          <button type="button" onClick={aoFechar} className="rounded-md px-2 py-1 text-sm font-semibold text-tinta-3 hover:bg-superficie">
            Fechar
          </button>
        </header>

        <div className="flex flex-col gap-6 px-5 py-5">
          {erro && (
            <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
              {erro}
            </p>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-tinta-2">Andamento</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {ANDAMENTOS.map((a) => (
                <button
                  key={a.valor}
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => mudarAndamento(c.id, a.valor as Andamento))}
                  aria-pressed={c.andamento === a.valor}
                  className={`flex items-center gap-2 rounded-campo border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed ${
                    c.andamento === a.valor ? "border-sincra bg-azul-50 text-sincra-tinta" : "border-linha text-tinta-2 hover:border-azul-200"
                  }`}
                >
                  <IconeAndamento andamento={a.valor} />
                  {a.rotulo}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="flex items-center justify-between text-xs font-semibold text-tinta-2">
              Etapas
              {c.etapas.length > 0 && (
                <span className="tabular text-cinza">
                  {feitas} de {c.etapas.length}
                </span>
              )}
            </h3>
            {c.etapas.length > 0 && (
              <div className="h-1.5 overflow-hidden rounded-full bg-superficie" aria-hidden>
                <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${(feitas / c.etapas.length) * 100}%` }} />
              </div>
            )}
            <ul className="flex flex-col">
              {c.etapas.map((e) => (
                <li key={e.id} className="group flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={e.feita}
                    disabled={pendente}
                    onChange={(ev) => rodar(() => alternarEtapa(e.id, ev.target.checked))}
                    aria-label={e.titulo}
                    className="size-4 accent-[var(--color-ok)]"
                  />
                  <span className={`flex-1 text-sm leading-5 ${e.feita ? "text-cinza line-through" : "text-tinta"}`}>{e.titulo}</span>
                  <button
                    type="button"
                    onClick={() => rodar(() => removerEtapa(e.id))}
                    className="text-xs font-semibold text-cinza opacity-0 group-hover:opacity-100 hover:text-critico focus:opacity-100"
                  >
                    Tirar
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(ev) => {
                ev.preventDefault();
                const t = novaEtapa;
                rodar(() => adicionarEtapa(c.id, t), () => setNovaEtapa(""));
              }}
              className="flex gap-2"
            >
              <input
                value={novaEtapa}
                onChange={(e) => setNovaEtapa(e.target.value)}
                maxLength={300}
                placeholder="Nova etapa, ex.: Revisar com o jurídico"
                aria-label="Nova etapa"
                className={`${classeCampo} flex-1`}
              />
              <button type="submit" disabled={pendente || !novaEtapa.trim()} className="rounded-campo bg-azul-50 px-3 text-sm font-semibold text-sincra-tinta disabled:opacity-50">
                Adicionar
              </button>
            </form>
          </section>

          <form action={acao} key={`${c.id}-${estado.ok ?? 0}`} className="flex flex-col gap-3 border-t border-linha pt-5">
            <input type="hidden" name="task_id" value={c.id} />
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
              Tarefa
              <input name="title" required maxLength={300} defaultValue={c.titulo} className={classeCampo} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
              Descrição
              <textarea name="description" rows={3} defaultValue={c.descricao ?? ""} className={`${classeCampo} h-auto py-2`} />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
              Prioridade
              <select name="prioridade" defaultValue={c.prioridade} className={classeCampo}>
                {PRIORIDADES_TAREFA.map((p) => (
                  <option key={p.valor} value={p.valor}>
                    {p.rotulo}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Início
                <input type="date" name="start_date" defaultValue={c.inicio ?? ""} className={`${classeCampo} tabular`} />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Entrega
                <input type="date" name="due_date" defaultValue={c.dia ?? ""} className={`${classeCampo} tabular`} />
              </label>
            </div>
            <p className="-mt-1 text-xs text-cinza">Com início, a tarefa ocupa vários dias no quadro (uma faixa em cada dia até a entrega).</p>
            {c.pedidoPor && c.criadorId === eu && (
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                Data pedida
                <input type="date" name="requested_date" defaultValue={c.dataPedida ?? ""} className={`${classeCampo} tabular`} />
              </label>
            )}
            {c.dataPedida && c.criadorId !== eu && <p className="text-xs text-tinta-3">Pedido para {rotuloDia(c.dataPedida)}.</p>}
            {estado.erro && (
              <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
                {estado.erro}
              </p>
            )}
            <button type="submit" disabled={salvando} className={`${classeBotaoPrimario} self-start`}>
              {salvando ? "Salvando…" : "Salvar"}
            </button>
          </form>

          {c.contexto && (
            <Link href={c.contexto.href} className="text-sm font-semibold text-sincra-tinta">
              Abrir {c.contexto.rotulo}
            </Link>
          )}

          {podeLixeira && (
            <div className="border-t border-linha pt-5">
              <button
                type="button"
                disabled={pendente}
                onClick={() => rodar(() => moverParaLixeira(c.id), aoFechar)}
                className="text-sm font-semibold text-tinta-3 hover:text-critico"
              >
                Mover para a lixeira
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
