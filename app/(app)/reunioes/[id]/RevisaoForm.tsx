"use client";

import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";

import { useActionState } from "react";
import { classeAreaTexto, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { confirmar, type EstadoReuniao } from "@/lib/actions/reunioes";
import type { ExtracaoReuniao } from "@/lib/ia/extracao";

type Socio = { id: string; apelido: string };

const caixa = "mt-2.5 size-4 shrink-0 accent-tinta";
const campoMenor = `${classeCampo} h-10`;

// Revisão humana da extração (princípio 5 da visão): cada item pode ser editado ou desmarcado.
export function RevisaoForm({
  id,
  extracao,
  socios,
  pessoasExistentes,
  socioAtual,
}: {
  id: string;
  extracao: ExtracaoReuniao;
  socios: Socio[];
  pessoasExistentes: string[];
  socioAtual: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoReuniao, FormData>(confirmar, {});
  const jaExiste = (nome: string) => pessoasExistentes.includes(nome.trim().toLowerCase());
  const socioPorNome = (nome: string | null) =>
    socios.find((s) => nome && s.apelido.toLowerCase() === nome.trim().split(" ")[0].toLowerCase())?.id ?? socioAtual;

  return (
    <form action={acao} className="flex flex-col gap-6">
      <AvisoAlteracoes />
      <input type="hidden" name="interaction_id" value={id} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-tinta">Resumo</legend>
        <textarea name="resumo" required defaultValue={extracao.resumo} className={`${classeAreaTexto} min-h-32`} />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-tinta">
          Próximos passos <span className="font-normal text-cinza">· viram tarefas</span>
        </legend>
        {extracao.proximos_passos.length === 0 && <p className="text-sm text-cinza">Nenhum próximo passo identificado.</p>}
        {extracao.proximos_passos.map((p, i) => (
          <div key={i} className="flex gap-3 rounded-campo border border-linha p-3">
            <input type="checkbox" name={`passo_incluir_${i}`} defaultChecked aria-label="Criar esta tarefa" className={caixa} />
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_140px_150px]">
              <input name={`passo_texto_${i}`} defaultValue={p.tarefa} aria-label="Tarefa" className={campoMenor} />
              <select name={`passo_resp_${i}`} defaultValue={socioPorNome(p.responsavel)} aria-label="Responsável" className={campoMenor}>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.apelido}
                  </option>
                ))}
              </select>
              <input type="date" name={`passo_prazo_${i}`} defaultValue={p.prazo ?? ""} aria-label="Prazo" className={`${campoMenor} tabular`} />
            </div>
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-tinta">Decisões</legend>
        {extracao.decisoes.length === 0 && <p className="text-sm text-cinza">Nenhuma decisão identificada.</p>}
        {extracao.decisoes.map((d, i) => (
          <div key={i} className="flex gap-3">
            <input type="checkbox" name={`decisao_incluir_${i}`} defaultChecked aria-label="Registrar esta decisão" className={caixa} />
            <input name={`decisao_texto_${i}`} defaultValue={d} aria-label="Decisão" className={campoMenor} />
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-tinta">
          Pessoas citadas <span className="font-normal text-cinza">· entram na organização</span>
        </legend>
        {extracao.pessoas.length === 0 && <p className="text-sm text-cinza">Nenhuma pessoa nova identificada.</p>}
        {extracao.pessoas.map((p, i) => {
          const existe = jaExiste(p.nome);
          return (
            <div key={i} className="flex gap-3 rounded-campo border border-linha p-3">
              <input
                type="checkbox"
                name={`pessoa_incluir_${i}`}
                defaultChecked={!existe}
                aria-label="Cadastrar esta pessoa"
                className={caixa}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name={`pessoa_nome_${i}`} defaultValue={p.nome} aria-label="Nome" className={campoMenor} />
                  <input name={`pessoa_cargo_${i}`} defaultValue={p.cargo ?? ""} placeholder="Cargo" aria-label="Cargo" className={campoMenor} />
                  <input name={`pessoa_email_${i}`} defaultValue={p.email ?? ""} placeholder="E-mail" aria-label="E-mail" className={campoMenor} />
                  <input name={`pessoa_tel_${i}`} defaultValue={p.telefone ?? ""} placeholder="Telefone" aria-label="Telefone" className={campoMenor} />
                </div>
                {existe && <span className="text-xs text-cinza">Já cadastrada nesta organização. Desmarcada para não duplicar.</span>}
              </div>
            </div>
          );
        })}
      </fieldset>

      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Gravando…" : "Confirmar e gravar no CRM"}
        </button>
      </div>
    </form>
  );
}
