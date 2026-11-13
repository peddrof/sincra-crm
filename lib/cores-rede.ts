// Cores da rede (mapa de conexões e mapa do Brasil), todas da paleta do brandbook.
// Cada categoria tem cor própria e a legenda sempre mostra o nome junto (status nunca só pela cor).

export const COR_TIPO: Record<string, { cor: string; rotulo: string }> = {
  hospital: { cor: "#147DFF", rotulo: "Hospital" },
  clinica: { cor: "#6EAFFF", rotulo: "Clínica" },
  medico: { cor: "#1A7F4B", rotulo: "Médico" },
  fundo: { cor: "#8F5A00", rotulo: "Fundo" },
  operadora: { cor: "#464C59", rotulo: "Operadora" },
  outro: { cor: "#8A919E", rotulo: "Outro" },
};

export const COR_SITUACAO: Record<string, { cor: string; rotulo: string }> = {
  em_aberto: { cor: "#147DFF", rotulo: "Contato em aberto" },
  operando: { cor: "#1A7F4B", rotulo: "Operando" },
  sem_negocio: { cor: "#8F5A00", rotulo: "Sem negócio" },
  antigo: { cor: "#B4BAC4", rotulo: "Contato antigo" },
};

export const COR_REDE = {
  sincra: "#147DFF",
  pessoa: "#9CC5FF",
  negocio: "#0B63D9",
};
