"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import simbolo from "@/public/sincra-simbolo.svg";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForceGraphMethods } from "react-force-graph-2d";
import { COR_REDE, COR_TIPO } from "@/lib/cores-rede";
import { chaveNivel, COR_PROFUNDIDADE, type Visao } from "@/lib/relacionamento";

// O componente usa canvas e window: só no navegador.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

export type Grupo = "sincra" | "organizacao" | "pessoa" | "negocio";
export type No = {
  id: string;
  nome: string;
  grupo: Grupo;
  tipo?: string;
  href: string;
  subtitulo?: string;
  info?: [string, string][];
  profundidade?: number | null;
  visao?: Visao;
};

export type Ligacao = { source: string; target: string };

const ALTURA = 640;

const FILTROS = [
  { valor: "organizacao", rotulo: "Organizações" },
  { valor: "pessoa", rotulo: "Pessoas" },
  { valor: "negocio", rotulo: "Negócios" },
] as const;

const ROTULO_GRUPO: Record<Grupo, string> = {
  sincra: "Centro da rede",
  organizacao: "Organização",
  pessoa: "Pessoa",
  negocio: "Negócio",
};

function corDo(no: No): string {
  if (no.grupo === "organizacao") return COR_TIPO[no.tipo ?? "outro"]?.cor ?? COR_TIPO.outro.cor;
  if (no.grupo === "pessoa") return COR_PROFUNDIDADE[chaveNivel(no.profundidade)].cor;
  return COR_REDE[no.grupo];
}

function idDe(ponta: unknown): string {
  return typeof ponta === "object" && ponta !== null ? (ponta as { id: string }).id : String(ponta);
}

// Grafo de conexões no estilo do Obsidian. A Sincra fica no centro e liga todas as organizações; pessoas e
// negócios se ligam à organização deles. Clique num ponto para ver os dados ao lado; o painel mostra o
// resumo da rede (children) quando nada está selecionado.
export function Grafo({ nos, ligacoes, children }: { nos: No[]; ligacoes: Ligacao[]; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const grafo = useRef<ForceGraphMethods | undefined>(undefined);
  const forcasProntas = useRef(false);
  const enquadrado = useRef(false);
  const [largura, setLargura] = useState(800);
  const [visiveis, setVisiveis] = useState<Record<string, boolean>>({ organizacao: true, pessoa: true, negocio: true });
  const [busca, setBusca] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  // Pessoas: por padrão só a visão principal (sem resposta e recusas ficam de fora, sem apagar nada).
  const [visaoPessoas, setVisaoPessoas] = useState<"principal" | "revisao" | "todas">("principal");
  const [niveisOcultos, setNiveisOcultos] = useState<Set<string>>(new Set());
  // Símbolo oficial da Sincra desenhado no nó central (o canvas só desenha depois que a imagem carrega).
  const [icone, setIcone] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setIcone(img);
    img.src = simbolo.src;
  }, []);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dados = useMemo(() => {
    const pessoaVisivel = (n: No) =>
      (visaoPessoas === "todas" || n.visao === "principal" || (visaoPessoas === "revisao" && n.visao === "revisao")) &&
      !niveisOcultos.has(chaveNivel(n.profundidade));
    const ids = new Set(
      nos.filter((n) => n.grupo === "sincra" || (visiveis[n.grupo] && (n.grupo !== "pessoa" || pessoaVisivel(n)))).map((n) => n.id),
    );
    const grau = new Map<string, number>();
    const links = ligacoes.filter((l) => ids.has(l.source) && ids.has(l.target));
    for (const l of links) {
      grau.set(l.source, (grau.get(l.source) ?? 0) + 1);
      grau.set(l.target, (grau.get(l.target) ?? 0) + 1);
    }
    return {
      // A Sincra fica presa no centro; o resto se arruma em volta.
      nodes: nos.filter((n) => ids.has(n.id)).map((n) => ({ ...n, grau: grau.get(n.id) ?? 0, ...(n.grupo === "sincra" ? { fx: 0, fy: 0 } : {}) })),
      links: links.map((l) => ({ ...l })),
    };
  }, [nos, ligacoes, visiveis, visaoPessoas, niveisOcultos]);

  // Vizinhança completa (sem filtros), para o painel de detalhes.
  const vizinhosDe = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const l of ligacoes) {
      m.set(l.source, [...(m.get(l.source) ?? []), l.target]);
      m.set(l.target, [...(m.get(l.target) ?? []), l.source]);
    }
    return m;
  }, [ligacoes]);
  const porId = useMemo(() => new Map(nos.map((n) => [n.id, n])), [nos]);

  const focoBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? (dados.nodes.find((n) => n.grupo !== "sincra" && n.nome.toLowerCase().includes(termo))?.id ?? null) : null;
  }, [busca, dados.nodes]);
  const foco = hover ?? selecionado ?? focoBusca;

  // Vizinhos do nó em foco ficam acesos; o resto esmaece. Na Sincra (liga tudo) não esmaece nada.
  const acesos = useMemo(() => {
    if (!foco || porId.get(foco)?.grupo === "sincra") return null;
    const v = new Set([foco]);
    for (const l of dados.links) {
      const s = idDe(l.source);
      const t = idDe(l.target);
      if (s === foco) v.add(t);
      if (t === foco) v.add(s);
    }
    return v;
  }, [foco, dados.links, porId]);

  const sel = selecionado ? porId.get(selecionado) : undefined;
  const ligadosSel = sel
    ? (vizinhosDe.get(sel.id) ?? []).map((id) => porId.get(id)).filter((n): n is No => Boolean(n) && n!.grupo !== "sincra")
    : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTROS.map((g) => (
            <label key={g.valor} className="flex items-center gap-2 rounded-full border border-azul-100 bg-white px-3 py-1.5 text-sm text-tinta">
              <input
                type="checkbox"
                checked={visiveis[g.valor]}
                onChange={(e) => setVisiveis((v) => ({ ...v, [g.valor]: e.target.checked }))}
                className="accent-sincra"
              />
              {g.rotulo}
            </label>
          ))}
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && focoBusca) setSelecionado(focoBusca);
            }}
            placeholder="Buscar um nome"
            aria-label="Buscar no mapa de conexões"
            className="h-9 min-w-48 flex-1 rounded-full border border-linha bg-white px-4 text-sm outline-none focus:border-sincra focus:ring-3 focus:ring-azul-100"
          />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-3">
          <span className="flex items-center gap-1.5">
            <Image src={simbolo} alt="" width={12} height={12} unoptimized />
            Sincra
          </span>
          {Object.entries(COR_TIPO).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: v.cor }} />
              {v.rotulo}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: COR_REDE.negocio }} />
            Negócio
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-campo border border-azul-100 bg-white px-3 py-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-tinta-2">
            Pessoas
            <select
              value={visaoPessoas}
              onChange={(e) => setVisaoPessoas(e.target.value as typeof visaoPessoas)}
              className="h-8 rounded-full border border-linha bg-white px-2 text-xs text-tinta"
            >
              <option value="principal">Visão principal</option>
              <option value="revisao">Principal + fila de revisão</option>
              <option value="todas">Todas</option>
            </select>
          </label>
          {Object.entries(COR_PROFUNDIDADE).map(([k, v]) => (
            <button
              key={k}
              type="button"
              aria-pressed={!niveisOcultos.has(k)}
              onClick={() =>
                setNiveisOcultos((o) => {
                  const n = new Set(o);
                  if (n.has(k)) n.delete(k);
                  else n.add(k);
                  return n;
                })
              }
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-tinta hover:bg-azul-25 ${niveisOcultos.has(k) ? "opacity-40" : ""}`}
            >
              <span className="size-2.5 rounded-full" style={{ background: v.cor }} />
              {v.rotulo}
            </button>
          ))}
        </div>

        <div ref={caixa} className="overflow-hidden rounded-cartao border border-azul-100 bg-azul-25" style={{ height: ALTURA }}>
          <ForceGraph2D
            graphData={dados}
            width={largura}
            height={ALTURA}
            backgroundColor="#F3F8FF"
            nodeId="id"
            ref={grafo}
            cooldownTicks={160}
            onEngineTick={() => {
              // Afasta as organizações do centro e espalha os pontos (o padrão do d3 deixa tudo colado).
              const fg = grafo.current;
              if (!fg || forcasProntas.current) return;
              forcasProntas.current = true;
              const link = fg.d3Force("link") as unknown as { distance: (f: (l: { source: unknown; target: unknown }) => number) => void } | undefined;
              link?.distance((l) => (idDe(l.source) === "sincra" || idDe(l.target) === "sincra" ? 110 : 34));
              const carga = fg.d3Force("charge") as unknown as { strength: (v: number) => void } | undefined;
              carga?.strength(-140);
              fg.d3ReheatSimulation();
            }}
            onEngineStop={() => {
              if (enquadrado.current) return;
              enquadrado.current = true;
              grafo.current?.zoomToFit(400, 40);
            }}
            linkColor={(l) => {
              const s = idDe(l.source);
              const t = idDe(l.target);
              if (acesos) return acesos.has(s) && acesos.has(t) ? "rgba(20,125,255,0.6)" : "rgba(156,197,255,0.18)";
              return s.startsWith("sincra") || t.startsWith("sincra") ? "rgba(20,125,255,0.22)" : "rgba(20,125,255,0.45)";
            }}
            linkWidth={1}
            onNodeHover={(n) => setHover(n ? String((n as { id: string }).id) : null)}
            onNodeClick={(n) => setSelecionado(String((n as { id: string }).id))}
            onBackgroundClick={() => setSelecionado(null)}
            nodeCanvasObject={(n, ctx, escala) => {
              const no = n as unknown as No & { grau: number; x: number; y: number };
              const raio =
                no.grupo === "sincra"
                  ? 11
                  : no.grupo === "organizacao"
                    ? 4 + Math.min(no.grau, 12) * 0.6
                    : no.grupo === "negocio"
                      ? 3
                      : 2.4 + (no.profundidade ?? 0) * 1.2;
              const apagado = acesos && !acesos.has(no.id);
              ctx.globalAlpha = apagado ? 0.18 : 1;
              if (no.grupo === "sincra") {
                ctx.fillStyle = "rgba(20,125,255,0.16)";
                ctx.beginPath();
                ctx.arc(no.x, no.y, raio + 7, 0, 2 * Math.PI);
                ctx.fill();
              }
              ctx.beginPath();
              if (no.grupo === "sincra" && icone) {
                ctx.drawImage(icone, no.x - raio, no.y - raio, raio * 2, raio * 2);
                ctx.rect(no.x - raio, no.y - raio, raio * 2, raio * 2);
              } else {
                ctx.fillStyle = corDo(no);
                if (no.grupo === "negocio") ctx.rect(no.x - raio, no.y - raio, raio * 2, raio * 2);
                else ctx.arc(no.x, no.y, raio, 0, 2 * Math.PI);
                ctx.fill();
              }
              if (foco === no.id && no.grupo !== "sincra") {
                ctx.lineWidth = 2 / escala;
                ctx.strokeStyle = "#13161F";
                ctx.stroke();
              }
              // Rótulos: sempre para a Sincra e as organizações; para os demais, com zoom ou em foco.
              const mostrar =
                no.grupo === "sincra" ||
                no.grupo === "organizacao" ||
                (no.grupo === "pessoa" && (no.profundidade ?? 0) >= 2) ||
                escala > 2.2 ||
                (acesos && !apagado);
              if (mostrar) {
                const tamanho = Math.max((no.grupo === "sincra" ? 13 : 10) / escala, 2.5);
                ctx.font = `${no.grupo === "pessoa" || no.grupo === "negocio" ? 400 : 600} ${tamanho}px Inter, Arial, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "top";
                ctx.fillStyle = "#13161F";
                ctx.fillText(no.nome, no.x, no.y + raio + (no.grupo === "sincra" ? 8 : 1.5));
              }
              ctx.globalAlpha = 1;
            }}
            nodePointerAreaPaint={(n, cor, ctx) => {
              const no = n as unknown as { x: number; y: number; grupo: Grupo };
              ctx.fillStyle = cor;
              ctx.beginPath();
              ctx.arc(no.x, no.y, no.grupo === "sincra" ? 14 : 8, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />
        </div>
        <p className="text-xs text-cinza">
          Arraste para mover, use a roda do mouse para zoom e clique num ponto para ver os dados. Clique no fundo para voltar ao resumo.
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        {sel ? (
          <section className="flex flex-col gap-3 rounded-cartao border border-azul-100 bg-azul-25 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-sincra-tinta">
                  <span className={`size-2.5 ${sel.grupo === "negocio" ? "rounded-sm" : "rounded-full"}`} style={{ background: corDo(sel) }} />
                  {sel.subtitulo ?? ROTULO_GRUPO[sel.grupo]}
                </span>
                <h2 className="text-base leading-6 font-semibold text-tinta">{sel.nome}</h2>
              </div>
              <button type="button" onClick={() => setSelecionado(null)} className="shrink-0 text-xs font-semibold text-tinta-3 hover:text-tinta">
                Fechar
              </button>
            </div>
            {sel.info && sel.info.length > 0 && (
              <dl className="grid gap-1.5 text-sm">
                {sel.info.map(([rotulo, valor]) => (
                  <div key={rotulo} className="flex justify-between gap-3">
                    <dt className="text-cinza">{rotulo}</dt>
                    <dd className="text-right font-semibold text-tinta">{valor}</dd>
                  </div>
                ))}
              </dl>
            )}
            {sel.grupo !== "sincra" && ligadosSel.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h3 className="text-xs font-semibold text-tinta-2">Ligações ({ligadosSel.length})</h3>
                <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                  {ligadosSel.map((n) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => setSelecionado(n.id)}
                        className="flex w-full items-center gap-2 rounded-campo px-2 py-1 text-left text-sm text-tinta hover:bg-white"
                      >
                        <span className={`size-2 shrink-0 ${n.grupo === "negocio" ? "rounded-sm" : "rounded-full"}`} style={{ background: corDo(n) }} />
                        <span className="truncate">{n.nome}</span>
                        <span className="ml-auto shrink-0 text-xs text-cinza">{ROTULO_GRUPO[n.grupo]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sel.grupo !== "sincra" && (
              <Link href={sel.href} className="rounded-full bg-sincra px-4 py-2 text-center text-sm font-semibold text-white hover:bg-sincra-tinta">
                {sel.grupo === "negocio" ? "Abrir negócio" : sel.grupo === "pessoa" ? "Abrir contato" : "Abrir organização"}
              </Link>
            )}
          </section>
        ) : (
          children
        )}
      </aside>
    </div>
  );
}
