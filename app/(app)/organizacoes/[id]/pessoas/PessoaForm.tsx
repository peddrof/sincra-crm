"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";
import { Campo, classeAreaTexto, classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { salvarPessoa, type EstadoFormulario } from "@/lib/actions/crm";
import { NATUREZAS_LOCAL, PRIORIDADES, PROFUNDIDADES, SITUACOES, TIPOS_RELACAO } from "@/lib/relacionamento";
import { UFS } from "@/lib/validacao";

export type ValoresPessoa = {
  id?: string;
  organization_id?: string;
  full_name?: string;
  role_title?: string;
  email?: string;
  phone?: string;
  crm_number?: string;
  can_sign?: string;
  signing_evidence_document_id?: string;
  notes?: string;
  relacao_tipo?: string;
  profundidade?: string;
  situacao?: string;
  prioridade?: string;
  ultima_interacao?: string;
  confirmacao_pendente?: string;
  motivo_classificacao?: string;
  proximo_passo?: string;
  canal_contato?: string;
  fontes?: string;
  cidade?: string;
  uf?: string;
  natureza_local?: string;
};

const ROTULOS_CAMPOS: Record<string, string> = {
  full_name: "Nome",
  email: "E-mail",
  relacao_tipo: "Tipo de relação",
  profundidade: "Profundidade",
  situacao: "Situação",
  prioridade: "Prioridade",
  ultima_interacao: "Última interação conhecida",
  cidade: "Cidade",
  uf: "UF",
  natureza_local: "Natureza do local",
  signing_evidence_document_id: "Documento que comprova",
};

// Cadastro de pessoa. Dentro de uma organização (organização fixa) ou em Contatos (organização opcional:
// mentor, contador, advogado ou investidor não precisam de instituição nem de CRM).
export function PessoaForm({
  inicial,
  documentos,
  voltarPara,
  organizacoes,
}: {
  inicial: ValoresPessoa;
  documentos: { id: string; titulo: string }[];
  voltarPara: string;
  organizacoes?: { id: string; nome: string }[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoFormulario, FormData>(salvarPessoa, {});
  const v = { ...inicial, ...estado.valores } as ValoresPessoa;
  const [podeAssinar, setPodeAssinar] = useState(v.can_sign === "on");
  const erro = (campo: string) => estado.erros?.[campo];
  const invalido = (campo: string) => (erro(campo) ? { "aria-invalid": true, "aria-describedby": `${campo}-erro` } : {});
  const orgFixa = !organizacoes;

  return (
    <form action={acao} className="flex flex-col gap-6">
      <AvisoAlteracoes />
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {orgFixa ? (
        <input type="hidden" name="organization_id" value={v.organization_id ?? ""} />
      ) : (
        <>
          {/* Em Contatos a assinatura não é editada: mantém o que já estava gravado. */}
          <input type="hidden" name="contatos" value="1" />
          {v.can_sign === "on" && <input type="hidden" name="can_sign" value="on" />}
          {v.signing_evidence_document_id && (
            <input type="hidden" name="signing_evidence_document_id" value={v.signing_evidence_document_id} />
          )}
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="full_name" rotulo="Nome" obrigatorio erro={erro("full_name")}>
          <input id="full_name" name="full_name" defaultValue={v.full_name} className={classeCampo} {...invalido("full_name")} />
        </Campo>
        {!orgFixa && (
          <Campo id="organization_id" rotulo="Organização" ajuda="Deixe em branco se não houver vínculo confirmado.">
            <select id="organization_id" name="organization_id" defaultValue={v.organization_id ?? ""} className={classeCampo}>
              <option value="">Sem organização</option>
              {organizacoes!.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo id="role_title" rotulo="Cargo">
          <input id="role_title" name="role_title" defaultValue={v.role_title} placeholder="Diretor financeiro" className={classeCampo} />
        </Campo>
        <Campo id="email" rotulo="E-mail" erro={erro("email")}>
          <input id="email" name="email" type="email" defaultValue={v.email} className={classeCampo} {...invalido("email")} />
        </Campo>
        <Campo id="phone" rotulo="Telefone">
          <input id="phone" name="phone" type="tel" defaultValue={v.phone} placeholder="(81) 90000-0000" className={`${classeCampo} tabular`} />
        </Campo>
        <Campo id="crm_number" rotulo="CRM" ajuda="Só para médicos. Ex.: 12345/PE.">
          <input id="crm_number" name="crm_number" defaultValue={v.crm_number} className={`${classeCampo} tabular uppercase`} />
        </Campo>
      </div>

      <fieldset className="flex flex-col gap-4 rounded-campo border border-azul-100 bg-azul-25 p-4">
        <legend className="px-1 text-xs leading-4 font-semibold text-sincra-tinta">Relacionamento</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo id="relacao_tipo" rotulo="Tipo de relação" erro={erro("relacao_tipo")}>
            <select id="relacao_tipo" name="relacao_tipo" defaultValue={v.relacao_tipo ?? ""} className={classeCampo}>
              <option value="">Não definido</option>
              {TIPOS_RELACAO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="profundidade" rotulo="Profundidade" erro={erro("profundidade")}>
            <select id="profundidade" name="profundidade" defaultValue={v.profundidade ?? ""} className={classeCampo}>
              <option value="">Sem classificação</option>
              {PROFUNDIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="situacao" rotulo="Situação" erro={erro("situacao")} ajuda="Recusa grosseira só com evidência no texto ou confirmação sua.">
            <select id="situacao" name="situacao" defaultValue={v.situacao ?? ""} className={classeCampo}>
              <option value="">Não definida</option>
              {SITUACOES.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="prioridade" rotulo="Prioridade" erro={erro("prioridade")}>
            <select id="prioridade" name="prioridade" defaultValue={v.prioridade ?? ""} className={classeCampo}>
              <option value="">Sem prioridade</option>
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.rotulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="ultima_interacao" rotulo="Última interação conhecida" erro={erro("ultima_interacao")}>
            <input id="ultima_interacao" name="ultima_interacao" type="date" defaultValue={v.ultima_interacao} className={classeCampo} />
          </Campo>
          <Campo id="canal_contato" rotulo="Canal de contato" ajuda="Ex.: WhatsApp; grupo SINCRA · BAOBA.">
            <input id="canal_contato" name="canal_contato" defaultValue={v.canal_contato} className={classeCampo} />
          </Campo>
        </div>
        <label className="flex items-start gap-3 text-sm leading-[22px] text-tinta">
          <input type="checkbox" name="confirmacao_pendente" defaultChecked={v.confirmacao_pendente === "on"} className="mt-1 size-4 accent-sincra" />
          <span>
            Confirmação pendente
            <span className="block text-xs leading-4 text-cinza">Fica na fila de revisão, fora da visão principal, até ser confirmada.</span>
          </span>
        </label>
        <Campo id="motivo_classificacao" rotulo="Motivo da classificação">
          <textarea id="motivo_classificacao" name="motivo_classificacao" defaultValue={v.motivo_classificacao} className={classeAreaTexto} />
        </Campo>
        <Campo id="proximo_passo" rotulo="Próximo passo sugerido">
          <input id="proximo_passo" name="proximo_passo" defaultValue={v.proximo_passo} className={classeCampo} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-[1fr_96px_1fr]">
          <Campo id="cidade" rotulo="Cidade" ajuda="Só se confirmada. Nunca pelo DDD." erro={erro("cidade")}>
            <input id="cidade" name="cidade" defaultValue={v.cidade} className={classeCampo} />
          </Campo>
          <Campo id="uf" rotulo="UF" erro={erro("uf")}>
            <select id="uf" name="uf" defaultValue={v.uf ?? ""} className={classeCampo}>
              <option value="">—</option>
              {UFS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="natureza_local" rotulo="Natureza do local" erro={erro("natureza_local")} ajuda="Opcional.">
            <select id="natureza_local" name="natureza_local" defaultValue={v.natureza_local ?? ""} className={classeCampo}>
              <option value="">—</option>
              {NATUREZAS_LOCAL.map((n) => (
                <option key={n.valor} value={n.valor}>
                  {n.rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="fontes" rotulo="Fontes e evidências">
          <textarea id="fontes" name="fontes" defaultValue={v.fontes} className={classeAreaTexto} />
        </Campo>
      </fieldset>

      {orgFixa && (
        <fieldset className="flex flex-col gap-3 rounded-campo border border-linha p-4">
          <legend className="px-1 text-xs leading-4 font-semibold text-tinta-2">Assinatura</legend>
          <label className="flex items-start gap-3 text-sm leading-[22px] text-tinta">
            <input
              type="checkbox"
              name="can_sign"
              defaultChecked={podeAssinar}
              onChange={(e) => setPodeAssinar(e.target.checked)}
              className="mt-1 size-4 accent-tinta"
            />
            <span>
              Pode assinar pela organização
              <span className="block text-xs leading-4 text-cinza">
                Com base em contrato social ou procuração. Sem documento de comprovação, a geração de contrato vai pedir
                confirmação explícita.
              </span>
            </span>
          </label>
          {podeAssinar && (
            <Campo
              id="signing_evidence_document_id"
              rotulo="Documento que comprova"
              erro={erro("signing_evidence_document_id")}
              ajuda={documentos.length === 0 ? "Nenhum documento desta organização ainda." : undefined}
            >
              <select
                id="signing_evidence_document_id"
                name="signing_evidence_document_id"
                defaultValue={v.signing_evidence_document_id ?? ""}
                disabled={documentos.length === 0}
                className={classeCampo}
                {...invalido("signing_evidence_document_id")}
              >
                <option value="">Sem comprovação ainda</option>
                {documentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.titulo}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </fieldset>
      )}

      <Campo id="notes" rotulo="Observações">
        <textarea id="notes" name="notes" defaultValue={v.notes} className={classeAreaTexto} />
      </Campo>

      {/* Erro em campo pode ficar fora da tela (ex.: no bloco Relacionamento): avisa também junto do botão. */}
      {estado.erros && Object.keys(estado.erros).length > 0 && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          Não foi salvo. Corrija:{" "}
          {Object.keys(estado.erros)
            .map((c) => ROTULOS_CAMPOS[c] ?? c)
            .join(", ")}
          .
        </p>
      )}

      {estado.mensagem && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          {estado.mensagem}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar pessoa"}
        </button>
        <Link href={voltarPara} className={classeBotaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
