"use client";

import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";

import Link from "next/link";
import { useActionState } from "react";
import { Campo, classeAreaTexto, classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { salvarOrganizacao, type EstadoFormulario } from "@/lib/actions/crm";
import { TIPOS_ORGANIZACAO } from "@/lib/crm";
import { UFS } from "@/lib/validacao";

export type ValoresOrganizacao = {
  id?: string;
  type?: string;
  trade_name?: string;
  legal_name?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  website?: string;
  owner_id?: string;
  notes?: string;
};

export function OrganizacaoForm({
  inicial,
  socios,
  voltarPara,
}: {
  inicial: ValoresOrganizacao;
  socios: { id: string; nome: string }[];
  voltarPara: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarOrganizacao, {});
  const v = { ...inicial, ...estado.valores } as ValoresOrganizacao;
  const erro = (campo: string) => estado.erros?.[campo];
  const invalido = (campo: string) => (erro(campo) ? { "aria-invalid": true, "aria-describedby": `${campo}-erro` } : {});

  return (
    <form action={acao} className="flex flex-col gap-6">
      <AvisoAlteracoes />
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="type" rotulo="Tipo" obrigatorio erro={erro("type")}>
          <select id="type" name="type" defaultValue={v.type ?? ""} className={classeCampo} {...invalido("type")}>
            <option value="" disabled>
              Escolha
            </option>
            {TIPOS_ORGANIZACAO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="owner_id" rotulo="Responsável na Sincra">
          <select id="owner_id" name="owner_id" defaultValue={v.owner_id ?? ""} className={classeCampo}>
            <option value="">Sem responsável</option>
            {socios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo id="trade_name" rotulo="Nome" obrigatorio erro={erro("trade_name")} ajuda="Como a Sincra chama a organização.">
          <input id="trade_name" name="trade_name" defaultValue={v.trade_name} className={classeCampo} {...invalido("trade_name")} />
        </Campo>
        <Campo id="legal_name" rotulo="Razão social">
          <input id="legal_name" name="legal_name" defaultValue={v.legal_name} className={classeCampo} />
        </Campo>
        <Campo id="cnpj" rotulo="CNPJ" erro={erro("cnpj")} ajuda="Aceita o CNPJ numérico e o alfanumérico.">
          <input
            id="cnpj"
            name="cnpj"
            defaultValue={v.cnpj}
            placeholder="00.000.000/0000-00"
            autoComplete="off"
            className={`${classeCampo} tabular uppercase`}
            {...invalido("cnpj")}
          />
        </Campo>
        <Campo id="website" rotulo="Site">
          <input id="website" name="website" defaultValue={v.website} placeholder="https://" className={classeCampo} />
        </Campo>
        <div className="grid grid-cols-[1fr_96px] gap-4 sm:col-span-2 sm:grid-cols-[1fr_120px]">
          <Campo id="city" rotulo="Cidade">
            <input id="city" name="city" defaultValue={v.city} className={classeCampo} />
          </Campo>
          <Campo id="state" rotulo="UF" erro={erro("state")}>
            <select id="state" name="state" defaultValue={v.state ?? ""} className={classeCampo} {...invalido("state")}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="notes" rotulo="Observações" className="sm:col-span-2">
          <textarea id="notes" name="notes" defaultValue={v.notes} className={classeAreaTexto} />
        </Campo>
      </div>

      {estado.duplicado && (
        <p className="rounded-campo bg-atencao-bg px-3 py-2 text-sm leading-[22px] text-atencao">
          Esta organização já está cadastrada.{" "}
          <Link href={`/organizacoes/${estado.duplicado.id}`} className="font-semibold underline">
            Abrir {estado.duplicado.nome}
          </Link>
        </p>
      )}
      {estado.mensagem && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          {estado.mensagem}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar organização"}
        </button>
        <Link href={voltarPara} className={classeBotaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
