"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo, classeAreaTexto, classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";
import { salvarNegocio, type EstadoNegocio } from "@/lib/actions/negocios";

export type ValoresNegocio = {
  id?: string;
  organization_id?: string;
  pipeline_id?: string;
  stage_id?: string;
  title?: string;
  owner_id?: string;
  rate_percent?: string;
  amount?: string;
  expected_close_date?: string;
  notes?: string;
};

type Opcao = { id: string; nome: string };

export function NegocioForm({
  inicial,
  organizacoes,
  funis,
  etapas,
  socios,
  taxasPadrao,
  voltarPara,
  retorno,
}: {
  retorno?: string;
  inicial: ValoresNegocio;
  organizacoes: Opcao[];
  funis: (Opcao & { chave: string })[];
  etapas: (Opcao & { funilId: string })[];
  socios: Opcao[];
  taxasPadrao: Record<string, string>;
  voltarPara: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoNegocio, FormData>(salvarNegocio, {});
  const v = { ...inicial, ...estado.valores } as ValoresNegocio;
  const [funilId, setFunilId] = useState(v.pipeline_id ?? funis[0]?.id ?? "");
  const etapasDoFunil = etapas.filter((e) => e.funilId === funilId);
  const erro = (c: string) => estado.erros?.[c];
  const invalido = (c: string) => (erro(c) ? { "aria-invalid": true, "aria-describedby": `${c}-erro` } : {});
  const taxaPadrao = taxasPadrao[funilId];

  return (
    <form action={acao} className="flex flex-col gap-6">
      <AvisoAlteracoes />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {retorno && <input type="hidden" name="retorno" value={retorno} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="title" rotulo="Nome do negócio" obrigatorio erro={erro("title")} className="sm:col-span-2">
          <input id="title" name="title" defaultValue={v.title} placeholder="Antecipação 2027" className={classeCampo} {...invalido("title")} />
        </Campo>
        <Campo id="organization_id" rotulo="Organização" obrigatorio erro={erro("organization_id")}>
          <select id="organization_id" name="organization_id" defaultValue={v.organization_id ?? ""} className={classeCampo} {...invalido("organization_id")}>
            <option value="" disabled>
              Escolha
            </option>
            {organizacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="owner_id" rotulo="Responsável">
          <select id="owner_id" name="owner_id" defaultValue={v.owner_id ?? ""} className={classeCampo}>
            <option value="">Sem responsável</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="pipeline_id" rotulo="Funil" obrigatorio erro={erro("pipeline_id")}>
          <select
            id="pipeline_id"
            name="pipeline_id"
            value={funilId}
            onChange={(e) => setFunilId(e.target.value)}
            className={classeCampo}
          >
            {funis.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="stage_id" rotulo="Etapa" obrigatorio erro={erro("stage_id")}>
          <select
            key={funilId}
            id="stage_id"
            name="stage_id"
            defaultValue={etapasDoFunil.some((e) => e.id === v.stage_id) ? v.stage_id : etapasDoFunil[0]?.id}
            className={classeCampo}
            {...invalido("stage_id")}
          >
            {etapasDoFunil.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          id="rate_percent"
          rotulo="Taxa (% ao mês)"
          erro={erro("rate_percent")}
          ajuda={taxaPadrao ? `Em branco usa a padrão do funil: ${taxaPadrao}% a.m.` : undefined}
        >
          <input
            id="rate_percent"
            name="rate_percent"
            inputMode="decimal"
            defaultValue={v.rate_percent}
            placeholder={taxaPadrao}
            className={`${classeCampo} tabular`}
            {...invalido("rate_percent")}
          />
        </Campo>
        <Campo id="amount" rotulo="Valor estimado (R$)" erro={erro("amount")}>
          <input
            id="amount"
            name="amount"
            inputMode="decimal"
            defaultValue={v.amount}
            placeholder="250.000,00"
            className={`${classeCampo} tabular`}
            {...invalido("amount")}
          />
        </Campo>
        <Campo id="expected_close_date" rotulo="Previsão de fechamento" erro={erro("expected_close_date")}>
          <input id="expected_close_date" name="expected_close_date" type="date" defaultValue={v.expected_close_date} className={`${classeCampo} tabular`} />
        </Campo>
        <Campo id="notes" rotulo="Notas" className="sm:col-span-2">
          <textarea id="notes" name="notes" defaultValue={v.notes} className={classeAreaTexto} />
        </Campo>
      </div>

      {estado.mensagem && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          {estado.mensagem}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar negócio"}
        </button>
        <Link href={voltarPara} className={classeBotaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
