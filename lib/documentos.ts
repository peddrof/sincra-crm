import type { StatusTipo } from "@/components/StatusPill";
import type { Database } from "@/lib/supabase/database.types";

export type StatusItem = Database["public"]["Enums"]["doc_item_status"];

export const STATUS_ITEM: Record<StatusItem, { tipo: StatusTipo; rotulo: string }> = {
  pendente: { tipo: "atencao", rotulo: "Pendente" },
  recebido: { tipo: "andamento", rotulo: "Recebido" },
  aprovado: { tipo: "concluido", rotulo: "Aprovado" },
  rejeitado: { tipo: "critico", rotulo: "Recusado" },
};

export const DOCUMENTO_MAX_BYTES = 25 * 1024 * 1024;

// Resumo no tom do brandbook: número na frente, depois o que falta.
export function resumoLista(itens: { title: string; status: StatusItem; required: boolean }[]): {
  recebidos: number;
  total: number;
  faltam: string[];
} {
  const recebidos = itens.filter((i) => i.status === "recebido" || i.status === "aprovado").length;
  const faltam = itens.filter((i) => i.required && (i.status === "pendente" || i.status === "rejeitado")).map((i) => i.title);
  return { recebidos, total: itens.length, faltam };
}

export function listarFaltantes(faltam: string[], limite = 3): string {
  if (faltam.length === 0) return "";
  const nomes = faltam.slice(0, limite).map((n) => n.charAt(0).toLowerCase() + n.slice(1));
  const resto = faltam.length - nomes.length;
  const texto =
    nomes.length === 1 ? nomes[0] : `${nomes.slice(0, -1).join(", ")} e ${nomes.at(-1)}`;
  return resto > 0 ? `${texto} e mais ${resto}` : texto;
}
