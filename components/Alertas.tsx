import Link from "next/link";
import { StatusPill, type StatusTipo } from "@/components/StatusPill";
import { linkDoEvento } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

const ROTULOS: Record<string, { rotulo: string; tipo: StatusTipo }> = {
  tarefa_atrasada: { rotulo: "Tarefa atrasada", tipo: "critico" },
  negocio_parado: { rotulo: "Negócio parado", tipo: "atencao" },
  documento_pendente: { rotulo: "Documento pendente", tipo: "atencao" },
  sem_contato: { rotulo: "Sem contato", tipo: "atencao" },
};

// Alertas de follow-up calculados agora (public.alertas_followup). O job diário publica os mesmos no feed.
// `somenteDe`: mostra só os alertas em que o sócio é responsável.
export async function Alertas({ somenteDe, limite = 8 }: { somenteDe?: string; limite?: number }) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("alertas_followup");
  if (error) console.error("[alertas] falha:", error.message);

  const alertas = (data ?? [])
    .filter((a) => !somenteDe || a.responsavel === somenteDe)
    .sort((a, b) => (a.tipo === "tarefa_atrasada" ? -1 : 0) - (b.tipo === "tarefa_atrasada" ? -1 : 0) || b.dias - a.dias);

  if (alertas.length === 0) {
    return <p className="text-sm leading-[22px] text-tinta-3">Nada atrasado ou parado com você.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-linha">
      {alertas.slice(0, limite).map((a) => {
        const r = ROTULOS[a.tipo] ?? { rotulo: "Alerta", tipo: "atencao" as const };
        const link = linkDoEvento({ entity_type: a.entidade, entity_id: a.entidade_id, organization_id: a.organizacao_id });
        return (
          <li key={`${a.tipo}-${a.entidade_id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1 text-sm leading-[22px] text-tinta">{a.resumo}</span>
            <div className="flex items-center gap-3">
              <StatusPill tipo={r.tipo}>{r.rotulo}</StatusPill>
              {link && (
                <Link href={link.href} className="text-sm font-semibold text-sincra-tinta">
                  Abrir
                </Link>
              )}
            </div>
          </li>
        );
      })}
      {alertas.length > limite && (
        <li className="pt-3 text-xs text-cinza">
          E mais {alertas.length - limite}. Veja no feed, filtrando por alertas automáticos.
        </li>
      )}
    </ul>
  );
}
