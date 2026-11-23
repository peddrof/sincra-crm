"use client";

import { useActionState, useState } from "react";
import { classeBotaoPrimario, classeCampo } from "@/components/campos";
import { criarTarefa, type EstadoTarefa } from "@/lib/actions/tarefas";
import { PRIORIDADES_TAREFA } from "@/lib/tarefas";

type Opcao = { id: string; nome: string };

// Formulário curto de tarefa. Com organização/negócio fixos (página do negócio) ou escolhidos (página de tarefas).
export function NovaTarefaForm({
  socios,
  responsavelPadrao,
  eu = responsavelPadrao,
  organizacaoId,
  negocioId,
  organizacoes,
}: {
  socios: Opcao[];
  responsavelPadrao: string;
  /** Sócio logado (quando o responsável padrão é outro). */
  eu?: string;
  organizacaoId?: string;
  negocioId?: string;
  organizacoes?: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoTarefa, FormData>(criarTarefa, {});
  const [responsavel, setResponsavel] = useState(responsavelPadrao);
  // Para outro sócio, a tarefa vira pedido: a data é a pedida e quem recebe escolhe o dia.
  const pedido = responsavel !== eu;
  const nomeResponsavel = socios.find((s) => s.id === responsavel)?.nome;

  return (
    <form action={acao} key={estado.ok ?? 0} className="flex flex-col gap-3">
      {organizacaoId && <input type="hidden" name="organization_id" value={organizacaoId} />}
      {negocioId && <input type="hidden" name="deal_id" value={negocioId} />}
      <label htmlFor={`tarefa-titulo-${negocioId ?? "geral"}`} className="sr-only">
        Nova tarefa
      </label>
      <input
        id={`tarefa-titulo-${negocioId ?? "geral"}`}
        name="title"
        required
        maxLength={300}
        placeholder="Nova tarefa, ex.: Enviar proposta ao diretor financeiro"
        className={classeCampo}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] lg:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Responsável
          <select
            name="assignee_id"
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
            className={classeCampo}
          >
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        {!pedido && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Início (opcional)
            <input type="date" name="start_date" className={`${classeCampo} tabular`} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          {pedido ? "Data pedida" : "Entrega"}
          <input type="date" name="due_date" className={`${classeCampo} tabular`} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Prioridade
          <select name="prioridade" defaultValue="normal" className={classeCampo}>
            {PRIORIDADES_TAREFA.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </label>
        {organizacoes && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Organização
            <select name="organization_id" defaultValue="" className={classeCampo}>
              <option value="">Nenhuma</option>
              {organizacoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Criando…" : "Criar tarefa"}
        </button>
      </div>
      {pedido && (
        <p className="text-xs leading-4 text-tinta-3">
          Vira um pedido para {nomeResponsavel}: a tarefa aparece em &quot;A agendar&quot; e {nomeResponsavel} arrasta para o dia
          em que consegue entregar. Todos os sócios veem.
        </p>
      )}
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
