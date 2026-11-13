// Peças de formulário no padrão do brandbook: rótulo 12/16 600, campo com raio 10 px, erro sempre com texto.

export const classeCampo =
  "h-11 w-full rounded-campo border border-linha bg-white px-3 text-sm text-tinta outline-none placeholder:text-cinza focus:border-sincra focus:ring-3 focus:ring-azul-100 aria-invalid:border-critico";

export const classeAreaTexto =
  "min-h-24 w-full rounded-campo border border-linha bg-white px-3 py-2.5 text-sm leading-[22px] text-tinta outline-none placeholder:text-cinza focus:border-sincra focus:ring-3 focus:ring-azul-100";

// Ação principal da tela em Azul Sincra (pedido de 11/11/2026: mais azul na interface).
export const classeBotaoPrimario =
  "inline-flex h-11 items-center justify-center rounded-full bg-sincra px-5 text-sm font-semibold text-white shadow-cartao transition-colors hover:bg-sincra-tinta disabled:cursor-wait disabled:bg-azul-300";

export const classeBotaoSecundario =
  "inline-flex h-11 items-center justify-center rounded-full border border-linha bg-white px-5 text-sm font-semibold text-tinta transition-colors hover:bg-superficie";

export function Campo({
  id,
  rotulo,
  erro,
  ajuda,
  obrigatorio,
  children,
  className = "",
}: {
  id: string;
  rotulo: string;
  erro?: string;
  ajuda?: string;
  obrigatorio?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-xs leading-4 font-semibold text-tinta-2">
        {rotulo}
        {obrigatorio && <span className="text-cinza"> · obrigatório</span>}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="text-xs leading-4 font-medium text-critico">
          {erro}
        </p>
      ) : ajuda ? (
        <p className="text-xs leading-4 text-cinza">{ajuda}</p>
      ) : null}
    </div>
  );
}

export function Secao({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-cartao border border-linha bg-white p-6 shadow-cartao">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg leading-6 font-semibold tracking-[-0.015em]">
          <span aria-hidden className="h-4 w-1 rounded-full bg-sincra" />
          {titulo}
        </h2>
        {acao}
      </div>
      {children}
    </section>
  );
}
