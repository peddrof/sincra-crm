"use client";

import { useActionState } from "react";
import { classeBotaoPrimario, classeCampo } from "@/components/campos";
import { abrirLista, type EstadoSimples } from "@/lib/actions/documentos";

type Opcao = { id: string; nome: string };

// Abre uma lista de documentos direto da página Documentos: escolhe a organização e o modelo.
export function AbrirListaGeral({ organizacoes, modelos }: { organizacoes: Opcao[]; modelos: (Opcao & { itens: number })[] }) {
  const [estado, acao, pendente] = useActionState<EstadoSimples, FormData>(abrirLista, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Organização
          <select name="organization_id" required defaultValue="" className={classeCampo}>
            <option value="" disabled>
              Escolha
            </option>
            {organizacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Modelo de lista
          <select name="checklist_id" required defaultValue={modelos[0]?.id ?? ""} className={classeCampo}>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} ({m.itens})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Abrindo…" : "Abrir lista"}
        </button>
      </div>
      {estado.erro && <p className="text-sm text-critico">{estado.erro}</p>}
    </form>
  );
}
