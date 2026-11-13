// Pílula de status do Brandbook Sincra: ponto, palavra e fundo claro.
// O status sempre vem com a palavra, nunca só com a cor. Mapeamento em docs/09-identidade-visual.md.

export type StatusTipo = "concluido" | "atencao" | "critico" | "andamento" | "neutro";

const estilos: Record<StatusTipo, { pilula: string; ponto: string }> = {
  concluido: { pilula: "bg-ok-bg text-ok", ponto: "bg-ok" },
  atencao: { pilula: "bg-atencao-bg text-atencao", ponto: "bg-atencao" },
  critico: { pilula: "bg-critico-bg text-critico", ponto: "bg-critico" },
  andamento: { pilula: "bg-andamento-bg text-andamento", ponto: "bg-andamento" },
  neutro: { pilula: "bg-neutro-bg text-neutro border border-linha", ponto: "bg-neutro" },
};

export function StatusPill({ tipo, children }: { tipo: StatusTipo; children: React.ReactNode }) {
  const e = estilos[tipo];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${e.pilula}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${e.ponto}`} />
      {children}
    </span>
  );
}
