import type { StatusTipo } from "@/components/StatusPill";

export const STATUS_REUNIAO: Record<string, { tipo: StatusTipo; rotulo: string }> = {
  agendada: { tipo: "andamento", rotulo: "Agendada" },
  processando: { tipo: "andamento", rotulo: "Analisando" },
  revisar: { tipo: "atencao", rotulo: "Para revisar" },
  confirmada: { tipo: "concluido", rotulo: "Confirmada" },
  erro: { tipo: "critico", rotulo: "Erro" },
};

export type Contexto = "organizacao" | "interna" | "fundo";

export const CONTEXTOS: { valor: Contexto; rotulo: string; ajuda: string }[] = [
  { valor: "organizacao", rotulo: "Com organização", ajuda: "Hospital, clínica, médico ou operadora" },
  { valor: "interna", rotulo: "Interna", ajuda: "Só os sócios da Sincra" },
  { valor: "fundo", rotulo: "Com o fundo", ajuda: "Fundo parceiro ou investidor" },
];

export function rotuloContexto(contexto: string, organizacao?: string | null): string {
  if (contexto === "interna") return "Reunião interna";
  if (contexto === "fundo") return organizacao ? `Fundo · ${organizacao}` : "Com o fundo";
  return organizacao ?? "Sem organização";
}

// Data/hora no formato do Google Agenda e do .ics (UTC, AAAAMMDDTHHMMSSZ).
export function utcCompacto(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function linkGoogleAgenda(r: {
  titulo: string;
  inicio: string;
  duracaoMin: number;
  detalhes?: string | null;
  local?: string | null;
  convidados: string[];
}): string {
  const ini = new Date(r.inicio);
  const fim = new Date(ini.getTime() + r.duracaoMin * 60_000);
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: r.titulo,
    dates: `${utcCompacto(ini)}/${utcCompacto(fim)}`,
    ctz: "America/Sao_Paulo",
  });
  if (r.detalhes) p.set("details", r.detalhes);
  if (r.local) p.set("location", r.local);
  if (r.convidados.length) p.set("add", r.convidados.join(","));
  return `https://calendar.google.com/calendar/render?${p}`;
}
