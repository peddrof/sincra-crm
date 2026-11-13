import Link from "next/link";
import { StatusPill } from "@/components/StatusPill";
import { alternarTarefa } from "@/lib/actions/tarefas";
import { hojeIso } from "@/lib/datas";
import { formatarDataCurta } from "@/lib/negocios";

export type TarefaLinha = {
  id: string;
  titulo: string;
  status: "aberta" | "concluida" | "cancelada";
  prazo: string | null;
  responsavel: string;
  contexto?: { rotulo: string; href: string } | null;
};


function situacao(t: TarefaLinha, hoje: string) {
  if (t.status === "concluida") return <StatusPill tipo="concluido">Concluída</StatusPill>;
  if (t.status === "cancelada") return <StatusPill tipo="neutro">Cancelada</StatusPill>;
  if (t.prazo && t.prazo < hoje) return <StatusPill tipo="critico">Atrasada</StatusPill>;
  if (t.prazo && t.prazo === hoje) return <StatusPill tipo="atencao">Vence hoje</StatusPill>;
  return null;
}

export function ListaTarefas({ tarefas, vazio }: { tarefas: TarefaLinha[]; vazio: string }) {
  const hoje = hojeIso();
  if (tarefas.length === 0) return <p className="text-sm leading-[22px] text-tinta-3">{vazio}</p>;

  return (
    <ul className="flex flex-col divide-y divide-linha">
      {tarefas.map((t) => {
        const concluida = t.status === "concluida";
        return (
          <li key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
            <form action={alternarTarefa} className="pt-0.5">
              <input type="hidden" name="task_id" value={t.id} />
              <input type="hidden" name="concluir" value={concluida ? "0" : "1"} />
              <button
                type="submit"
                aria-label={concluida ? `Reabrir: ${t.titulo}` : `Concluir: ${t.titulo}`}
                className={`flex size-5 items-center justify-center rounded-md border text-xs font-bold ${
                  concluida ? "border-ok bg-ok text-white" : "border-cinza-3 bg-white hover:border-tinta"
                }`}
              >
                {concluida ? "✓" : ""}
              </button>
            </form>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`text-sm leading-[22px] ${concluida ? "text-cinza line-through" : "text-tinta"}`}>{t.titulo}</span>
              <span className="text-xs leading-4 text-cinza">
                {t.responsavel}
                {t.prazo && (
                  <>
                    {" · "}
                    <span className="tabular">{formatarDataCurta(t.prazo)}</span>
                  </>
                )}
                {t.contexto && (
                  <>
                    {" · "}
                    <Link href={t.contexto.href} className="font-semibold text-sincra-tinta">
                      {t.contexto.rotulo}
                    </Link>
                  </>
                )}
              </span>
            </div>
            {situacao(t, hoje)}
          </li>
        );
      })}
    </ul>
  );
}
