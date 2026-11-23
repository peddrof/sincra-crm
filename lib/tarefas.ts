// Datas do quadro semanal de tarefas. Trabalha com "AAAA-MM-DD" (coluna date do banco), sem fuso:
// meio-dia UTC evita que a conta caia no dia anterior.

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

function data(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function isoValido(v: string | undefined | null): v is string {
  return Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(data(v).getTime()));
}

export function somarDias(iso: string, n: number): string {
  const d = data(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Segunda-feira da semana do dia.
export function inicioDaSemana(iso: string): string {
  const dow = data(iso).getUTCDay();
  return somarDias(iso, dow === 0 ? -6 : 1 - dow);
}

export function diasDaSemana(segunda: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

// "Seg 10/11"
export function rotuloDia(iso: string): string {
  const d = data(iso);
  return `${DIAS[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "10 a 16 de nov" / "27 de out a 2 de nov"
export function rotuloSemana(segunda: string): string {
  const a = data(segunda);
  const b = data(somarDias(segunda, 6));
  const mesA = MESES[a.getUTCMonth()];
  const mesB = MESES[b.getUTCMonth()];
  return mesA === mesB
    ? `${a.getUTCDate()} a ${b.getUTCDate()} de ${mesB}`
    : `${a.getUTCDate()} de ${mesA} a ${b.getUTCDate()} de ${mesB}`;
}

// Andamento de uma tarefa aberta (tasks.progresso) + "concluida" (tasks.status).
export const ANDAMENTOS = [
  { valor: "a_fazer", rotulo: "Para começar" },
  { valor: "em_andamento", rotulo: "Em andamento" },
  { valor: "pausada", rotulo: "Pausada" },
  { valor: "concluida", rotulo: "Concluída" },
] as const;
export type Andamento = (typeof ANDAMENTOS)[number]["valor"];

export const PRIORIDADES_TAREFA = [
  { valor: "urgente", rotulo: "Urgente" },
  { valor: "importante", rotulo: "Importante" },
  { valor: "normal", rotulo: "Normal" },
  { valor: "baixa", rotulo: "Baixa" },
] as const;
export type PrioridadeTarefa = (typeof PRIORIDADES_TAREFA)[number]["valor"];

export function andamentoDe(status: string, progresso: string): Andamento {
  if (status === "concluida") return "concluida";
  return (["a_fazer", "em_andamento", "pausada"].includes(progresso) ? progresso : "a_fazer") as Andamento;
}

// Dias entre duas datas (inclusive).
export function diasEntre(inicio: string, fim: string): number {
  return Math.round((data(fim).getTime() - data(inicio).getTime()) / 86_400_000) + 1;
}

// "14/11"
export function ddmm(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}
