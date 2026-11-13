import type { Database } from "@/lib/supabase/database.types";

export type TipoOrganizacao = Database["public"]["Enums"]["organization_type"];

export const TIPOS_ORGANIZACAO: { valor: TipoOrganizacao; rotulo: string }[] = [
  { valor: "hospital", rotulo: "Hospital" },
  { valor: "clinica", rotulo: "Clínica" },
  { valor: "operadora", rotulo: "Operadora" },
  { valor: "fundo", rotulo: "Fundo" },
  { valor: "medico", rotulo: "Médico" },
  { valor: "outro", rotulo: "Outro" },
];

export function rotuloTipo(tipo: TipoOrganizacao): string {
  return TIPOS_ORGANIZACAO.find((t) => t.valor === tipo)?.rotulo ?? tipo;
}

export function nomeCurto(perfil: { full_name: string; nickname: string | null } | null): string {
  if (!perfil) return "Sem responsável";
  return perfil.nickname ?? perfil.full_name.split(" ")[0];
}

const fuso = "America/Sao_Paulo";

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: fuso })
    .format(new Date(iso))
    .replace(".", "");
}

export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: fuso,
  })
    .format(new Date(iso))
    .replace(".", "");
}
