"use client";

import { useActionState } from "react";
import { Campo, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { salvarTaxas, type EstadoConfig } from "@/lib/actions/configuracoes";

export function TaxasForm({ hospital, medico }: { hospital: string; medico: string }) {
  const [estado, acao, pendente] = useActionState<EstadoConfig, FormData>(salvarTaxas, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="default_rate_hospital" rotulo="Hospitais e clínicas (% ao mês)">
          <input
            id="default_rate_hospital"
            name="default_rate_hospital"
            inputMode="decimal"
            defaultValue={hospital}
            className={`${classeCampo} tabular`}
          />
        </Campo>
        <Campo id="default_rate_medico" rotulo="Médicos (% ao mês)">
          <input id="default_rate_medico" name="default_rate_medico" inputMode="decimal" defaultValue={medico} className={`${classeCampo} tabular`} />
        </Campo>
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-campo bg-ok-bg px-3 py-2 text-sm text-ok">
          Taxas salvas. Negócios sem taxa própria passam a usar os novos valores.
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar taxas"}
        </button>
      </div>
    </form>
  );
}
