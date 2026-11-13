import Image from "next/image";
import simbolo from "@/public/sincra-simbolo.svg";

// Assinatura Sincra (símbolo + nome), proporções do Brandbook Sincra:
// H = altura do símbolo; nome com 0,9 H em Inter 600, tracking −2,5%; 0,3 H entre símbolo e nome.
// Cabeçalho padrão: H = 28 (símbolo 28 px, nome 25 px, 8 px de espaço). Mínimo: H = 20.
// Versões: "principal" (branco ou Superfície, nome Tinta), "ceu" e "tinta" (nome branco).
// Não usar sobre azul médio. Não distorcer, girar, sombrear nem trocar a fonte do nome.

type Variante = "principal" | "ceu" | "tinta";

export function Logo({ altura = 28, variante = "principal" }: { altura?: number; variante?: Variante }) {
  const h = Math.max(altura, 20);
  const corNome = variante === "principal" ? "text-tinta" : "text-white";
  return (
    <span className="inline-flex items-center" style={{ gap: Math.round(h * 0.3) }}>
      <Image src={simbolo} alt="" width={h} height={h} unoptimized priority />
      <span
        className={`font-sans font-semibold leading-none ${corNome}`}
        style={{ fontSize: Math.round(h * 0.9), letterSpacing: "-0.025em" }}
      >
        Sincra
      </span>
    </span>
  );
}

// Símbolo isolado (avatar, ícone do PWA). Mínimo 16 px. Não existe versão vertical da assinatura.
export function Simbolo({ tamanho = 32 }: { tamanho?: number }) {
  const t = Math.max(tamanho, 16);
  return <Image src={simbolo} alt="Sincra" width={t} height={t} unoptimized />;
}
