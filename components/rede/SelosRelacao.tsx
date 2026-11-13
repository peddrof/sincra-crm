import { StatusPill } from "@/components/StatusPill";
import { rotuloPrioridade, rotuloProfundidade, rotuloSituacao } from "@/lib/relacionamento";

// Profundidade (N), prioridade (P) e situação de uma pessoa, sempre com a palavra (nunca só cor).
export function SelosRelacao({
  profundidade,
  prioridade,
  situacao,
  pendente,
}: {
  profundidade: number | null;
  prioridade: number | null;
  situacao: string | null;
  pendente?: boolean;
}) {
  const n = rotuloProfundidade(profundidade);
  const p = rotuloPrioridade(prioridade);
  const s = rotuloSituacao(situacao);
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {n ? (
        <span
          title="Profundidade da relação"
          className={`tabular rounded-full px-2 py-0.5 text-xs font-semibold ${profundidade! >= 2 ? "bg-sincra text-white" : "bg-azul-50 text-sincra-tinta"}`}
        >
          {n}
        </span>
      ) : (
        <span className="rounded-full border border-linha px-2 py-0.5 text-xs font-semibold text-cinza">Sem nível</span>
      )}
      {p && (
        <span title="Prioridade" className="tabular rounded-full bg-tinta px-2 py-0.5 text-xs font-semibold text-white">
          {p}
        </span>
      )}
      {s && <StatusPill tipo={s.tipo}>{s.rotulo}</StatusPill>}
      {pendente && <StatusPill tipo="atencao">Confirmar</StatusPill>}
    </span>
  );
}
