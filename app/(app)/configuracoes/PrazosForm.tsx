"use client";

import { useActionState } from "react";
import { Campo, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { salvarPrazos, type EstadoConfig } from "@/lib/actions/configuracoes";

export function PrazosForm({ valores }: { valores: Record<string, string> }) {
  const [estado, acao, pendente] = useActionState<EstadoConfig, FormData>(salvarPrazos, {});
  const campos = [
    { chave: "followup_negocio_parado_dias", rotulo: "Negócio parado na etapa" },
    { chave: "followup_documento_pendente_dias", rotulo: "Documento pendente" },
    { chave: "followup_sem_contato_dias", rotulo: "Organização sem contato" },
  ];
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {campos.map((c) => (
          <Campo key={c.chave} id={c.chave} rotulo={`${c.rotulo} (dias)`}>
            <input
              id={c.chave}
              name={c.chave}
              type="number"
              min={1}
              max={365}
              defaultValue={valores[c.chave]}
              className={`${classeCampo} tabular`}
            />
          </Campo>
        ))}
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-campo bg-ok-bg px-3 py-2 text-sm text-ok">
          Prazos salvos. Valem a partir do próximo alerta.
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar prazos"}
        </button>
      </div>
    </form>
  );
}
