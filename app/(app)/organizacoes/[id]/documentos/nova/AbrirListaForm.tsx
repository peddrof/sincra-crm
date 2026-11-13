"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo, classeBotaoPrimario, classeBotaoSecundario, classeCampo } from "@/components/campos";
import { abrirLista, type EstadoSimples } from "@/lib/actions/documentos";

type Opcao = { id: string; nome: string };

export function AbrirListaForm({
  organizacaoId,
  modelos,
  negocios,
  negocioPadrao,
}: {
  organizacaoId: string;
  modelos: (Opcao & { itens: number })[];
  negocios: Opcao[];
  negocioPadrao?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoSimples, FormData>(abrirLista, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="organization_id" value={organizacaoId} />
      <Campo id="checklist_id" rotulo="Modelo de lista" obrigatorio>
        <select id="checklist_id" name="checklist_id" required defaultValue={modelos[0]?.id ?? ""} className={classeCampo}>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} ({m.itens} {m.itens === 1 ? "documento" : "documentos"})
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="name" rotulo="Nome da lista" ajuda="Em branco usa o nome do modelo.">
        <input id="name" name="name" className={classeCampo} />
      </Campo>
      <Campo id="deal_id" rotulo="Negócio">
        <select id="deal_id" name="deal_id" defaultValue={negocioPadrao ?? ""} className={classeCampo}>
          <option value="">Nenhum</option>
          {negocios.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nome}
            </option>
          ))}
        </select>
      </Campo>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Abrindo…" : "Abrir lista"}
        </button>
        <Link href={`/organizacoes/${organizacaoId}`} className={classeBotaoSecundario}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
