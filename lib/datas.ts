// Momento de N horas atrás, em ISO (para filtros de "a partir de agora, com folga").
export function isoHorasAtras(horas: number): string {
  return new Date(Date.now() - horas * 3_600_000).toISOString();
}

// Hoje no fuso de São Paulo, como "AAAA-MM-DD" (comparável com colunas date do banco).
export function hojeIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
