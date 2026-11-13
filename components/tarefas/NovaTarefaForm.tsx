"use client";

import { useActionState } from "react";
import { classeBotaoPrimario, classeCampo } from "@/components/campos";
import { criarTarefa, type EstadoTarefa } from "@/lib/actions/tarefas";

type Opcao = { id: string; nome: string };

// Formulário curto de tarefa. Com organização/negócio fixos (página do negócio) ou escolhidos (página de tarefas).
export function NovaTarefaForm({
  socios,
  responsavelPadrao,
  organizacaoId,
  negocioId,
  organizacoes,
}: {
  socios: Opcao[];
  responsavelPadrao: string;
  organizacaoId?: string;
  negocioId?: string;
  organizacoes?: Opcao[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoTarefa, FormData>(criarTarefa, {});

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
      <div className={`grid gap-3 ${organizacoes ? "sm:grid-cols-[1fr_1fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_auto]"} sm:items-end`}>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Responsável
          <select name="assignee_id" defaultValue={responsavelPadrao} className={classeCampo}>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Prazo
          <input type="date" name="due_date" className={`${classeCampo} tabular`} />
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
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
