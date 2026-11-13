"use client";

import { geoArea, geoCentroid, geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { COR_SITUACAO, COR_TIPO } from "@/lib/cores-rede";
import { chaveNivel, COR_PROFUNDIDADE, PRIORIDADES, rotuloPrioridade, rotuloSituacao, type Visao } from "@/lib/relacionamento";

export type PontoMapa = {
  id: string;
  nome: string;
  tipo: string;
  tipoRotulo: string;
  cidade: string | null;
  uf: string | null;
  lat: number | null;
  lng: number | null;
  responsavel: string;
  situacao: string;
  negocioAberto: string | null;
  pessoas: number;
  notas: string | null;
};

export type PessoaMapa = {
  id: string;
  nome: string;
  organizacao: string | null;
  cargo: string | null;
  profundidade: number | null;
  situacao: string | null;
  prioridade: number | null;
  visao: Visao;
  cidade: string | null;
  uf: string | null;
  natureza: string | null;
  lat: number | null;
  lng: number | null;
  proximoPasso: string | null;
};

type Estado = Feature<Geometry, { uf: string }>;
type Posicionado = {
  chave: string; // "o:<id>" ou "p:<id>"
  nome: string;
  descricao: string;
  pessoa: boolean;
  x: number;
  y: number;
  cor: string;
  aproximado: boolean;
  pulsa: boolean;
  legenda: string; // "o:<categoria>" ou "p:<nível>"
};

// O GeoJSON do IBGE segue a RFC 7946 (anel externo anti-horário); o d3-geo espera o contrário e, sem
// corrigir, entende "o planeta todo menos o estado". Cada polígono é avaliado sozinho (alguns, como ilhas
// do Paraná, já vêm no sentido certo): se a área passa de meia esfera, inverte os anéis dele.
type Anel = number[][];
function corrigirPoligono(aneis: Anel[]): Anel[] {
  return geoArea({ type: "Polygon", coordinates: aneis }) > 2 * Math.PI ? aneis.map((a) => [...a].reverse()) : aneis;
}
function corrigirSentido(f: Estado): Estado {
  const g = f.geometry;
  if (g.type === "Polygon") return { ...f, geometry: { ...g, coordinates: corrigirPoligono(g.coordinates) } };
  if (g.type === "MultiPolygon") return { ...f, geometry: { ...g, coordinates: g.coordinates.map(corrigirPoligono) } };
  return f;
}
const L = 760;
const A = 720;

// Mapa da rede da Sincra no Brasil (página inicial). Organizações e pessoas no mesmo mapa:
// - Organizações: círculos coloridos por tipo ou situação; sem cidade, no centro do estado (borda tracejada).
// - Pessoas: quadrados em tons de Tinta pela profundidade da relação; só com cidade informada (nunca pelo DDD
//   nem pelo endereço da organização). Sem cidade, ficam na lista "Contatos sem localização".
export function MapaBrasil({ pontos, pessoas = [] }: { pontos: PontoMapa[]; pessoas?: PessoaMapa[] }) {
  const [estados, setEstados] = useState<Estado[] | null>(null);
  const [modo, setModo] = useState<"tipo" | "situacao">("tipo");
  const [visaoP, setVisaoP] = useState<"principal" | "revisao" | "todas">("principal");
  const [prioridadeP, setPrioridadeP] = useState("");
  const [ocultos, setOcultos] = useState<Set<string>>(new Set());
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  useEffect(() => {
    fetch("/geo/brasil-uf.json")
      .then((r) => r.json())
      .then((g: FeatureCollection<Geometry, { uf: string }>) => setEstados(g.features.map(corrigirSentido)));
  }, []);

  const legendaOrg = modo === "tipo" ? COR_TIPO : COR_SITUACAO;

  // Pessoas que passam nos filtros de visão e prioridade (com ou sem localização).
  const pessoasFiltradas = useMemo(
    () =>
      pessoas.filter(
        (p) =>
          (visaoP === "todas" || p.visao === "principal" || (visaoP === "revisao" && p.visao === "revisao")) &&
          (!prioridadeP || String(p.prioridade) === prioridadeP),
      ),
    [pessoas, visaoP, prioridadeP],
  );

  const { caminho, posicionados } = useMemo(() => {
    if (!estados) return { caminho: null, posicionados: [] as Posicionado[] };
    const fc = { type: "FeatureCollection", features: estados } as FeatureCollection;
    const proj = geoMercator().fitExtent([[16, 16], [L - 16, A - 16]], fc);
    const centro = new Map(estados.map((e) => [e.properties.uf, geoCentroid(e)]));
    const vistos = new Map<string, number>();
    const posicionar = (coord: [number, number] | undefined, resto: Omit<Posicionado, "x" | "y">): Posicionado[] => {
      if (!coord) return [];
      const xy = proj(coord);
      if (!xy) return [];
      // Vários pontos na mesma cidade: espalha num pequeno círculo.
      const k = `${Math.round(xy[0])}|${Math.round(xy[1])}`;
      const n = vistos.get(k) ?? 0;
      vistos.set(k, n + 1);
      const ang = n * 2.4;
      const r = n === 0 ? 0 : 7 + n * 1.6;
      return [{ ...resto, x: xy[0] + Math.cos(ang) * r, y: xy[1] + Math.sin(ang) * r }];
    };
    const orgs = pontos.flatMap((p) => {
      const k = modo === "tipo" ? p.tipo : p.situacao;
      const coord: [number, number] | undefined =
        p.lat !== null && p.lng !== null ? [p.lng, p.lat] : p.uf ? (centro.get(p.uf) as [number, number] | undefined) : undefined;
      return posicionar(coord, {
        chave: `o:${p.id}`,
        nome: p.nome,
        descricao: `Organização · ${p.tipoRotulo}`,
        pessoa: false,
        cor: legendaOrg[k]?.cor ?? "#8A919E",
        aproximado: p.lat === null,
        pulsa: p.situacao === "em_aberto",
        legenda: `o:${k}`,
      });
    });
    const gente = pessoasFiltradas.flatMap((p) => {
      const k = chaveNivel(p.profundidade);
      return posicionar(p.lat !== null && p.lng !== null ? [p.lng, p.lat] : undefined, {
        chave: `p:${p.id}`,
        nome: p.nome,
        descricao: `Pessoa · ${COR_PROFUNDIDADE[k].rotulo.split(" · ")[0]}`,
        pessoa: true,
        cor: COR_PROFUNDIDADE[k].cor,
        aproximado: false,
        pulsa: p.prioridade === 1,
        legenda: `p:${k}`,
      });
    });
    return { caminho: geoPath(proj), posicionados: [...orgs, ...gente] };
  }, [estados, pontos, pessoasFiltradas, modo, legendaOrg]);

  const visiveis = posicionados.filter((p) => !ocultos.has(p.legenda));
  const org = selecionado?.startsWith("o:") ? pontos.find((p) => `o:${p.id}` === selecionado) : undefined;
  const pessoa = selecionado?.startsWith("p:") ? pessoas.find((p) => `p:${p.id}` === selecionado) : undefined;
  const ufsComPontos = new Set([
    ...pontos.filter((p) => visiveis.some((v) => v.chave === `o:${p.id}`)).map((p) => p.uf),
    ...pessoasFiltradas.filter((p) => visiveis.some((v) => v.chave === `p:${p.id}`)).map((p) => p.uf),
  ]);
  const semLocalOrg = pontos.filter((p) => !p.uf && p.lat === null).length;
  const semLocalPessoas = pessoasFiltradas.filter((p) => p.lat === null && !ocultos.has(`p:${chaveNivel(p.profundidade)}`));
  const sobreItem = visiveis.find((v) => v.chave === sobre);

  const alternar = (k: string) =>
    setOcultos((o) => {
      const n = new Set(o);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const chip = (ativo: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-semibold ${ativo ? "bg-sincra text-white" : "bg-azul-50 text-sincra-tinta hover:bg-azul-100"}`;
  const seletor = "h-9 rounded-full border border-linha bg-white px-3 text-sm text-tinta";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-tinta-2">Organizações por</span>
          {(["tipo", "situacao"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setModo(m);
                setOcultos((o) => new Set([...o].filter((k) => !k.startsWith("o:"))));
              }}
              className={chip(modo === m)}
            >
              {m === "tipo" ? "Tipo" : "Situação"}
            </button>
          ))}
          <span aria-hidden className="mx-1 h-5 w-px bg-linha" />
          <span className="text-xs font-semibold text-tinta-2">Pessoas</span>
          <select value={visaoP} onChange={(e) => setVisaoP(e.target.value as typeof visaoP)} aria-label="Visão das pessoas" className={seletor}>
            <option value="principal">Visão principal</option>
            <option value="revisao">Principal + fila de revisão</option>
            <option value="todas">Todas</option>
          </select>
          <select value={prioridadeP} onChange={(e) => setPrioridadeP(e.target.value)} aria-label="Prioridade das pessoas" className={seletor}>
            <option value="">Todas as prioridades</option>
            {PRIORIDADES.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="relative overflow-hidden rounded-cartao border border-azul-100 bg-gradient-to-b from-white to-azul-25">
          {!caminho ? (
            <p className="p-8 text-sm text-cinza">Carregando o mapa…</p>
          ) : (
            <svg viewBox={`0 0 ${L} ${A}`} className="mx-auto block h-auto max-h-[560px] w-full" role="img" aria-label="Mapa do Brasil com organizações e pessoas da rede da Sincra">
              <defs>
                <filter id="brilho" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              {estados!.map((e) => (
                <path
                  key={e.properties.uf}
                  d={caminho(e) ?? ""}
                  fill={ufsComPontos.has(e.properties.uf) ? "#D6E8FF" : "#E7F2FF"}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
              ))}
              {visiveis.map((p) => {
                const ativo = p.chave === selecionado || p.chave === sobre;
                const t = ativo ? 6 : 4.5;
                return (
                  <g
                    key={p.chave}
                    transform={`translate(${p.x},${p.y})`}
                    onClick={() => setSelecionado(p.chave)}
                    onMouseEnter={() => setSobre(p.chave)}
                    onMouseLeave={() => setSobre(null)}
                    className="cursor-pointer"
                    role="button"
                    aria-label={`${p.nome}, ${p.descricao}`}
                  >
                    <circle r={ativo ? 14 : 10} fill={p.cor} opacity={0.22} filter="url(#brilho)" />
                    {p.pulsa && (
                      <circle r={6} fill="none" stroke={p.cor} strokeWidth={1.5} opacity={0.6}>
                        <animate attributeName="r" from="6" to="16" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {p.pessoa ? (
                      <rect x={-t} y={-t} width={t * 2} height={t * 2} rx={2.5} fill={p.cor} stroke="#FFFFFF" strokeWidth={1.5} />
                    ) : (
                      <circle r={ativo ? 7 : 5} fill={p.cor} stroke="#FFFFFF" strokeWidth={1.5} strokeDasharray={p.aproximado ? "2 2" : undefined} />
                    )}
                  </g>
                );
              })}
              {/* Etiqueta do ponto em foco por cima de tudo: nome + o que ele é. */}
              {sobreItem && (
                <g transform={`translate(${sobreItem.x},${sobreItem.y - 30})`} pointerEvents="none">
                  <text textAnchor="middle" className="fill-tinta text-[12px] font-semibold" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
                    {sobreItem.nome}
                  </text>
                  <text y={13} textAnchor="middle" className="fill-tinta-3 text-[10px]" style={{ paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}>
                    {sobreItem.descricao}
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>
        {semLocalOrg > 0 && (
          <p className="text-xs text-cinza">
            {semLocalOrg} {semLocalOrg === 1 ? "organização sem cidade/UF não aparece" : "organizações sem cidade/UF não aparecem"} no mapa. Preencha a
            cidade na organização.
          </p>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-cartao border border-linha bg-white p-4 shadow-cartao">
          <h2 className="text-sm font-semibold text-tinta">Legenda</h2>
          <div className="flex flex-col gap-1">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-tinta-2">
              <span className="size-2.5 rounded-full bg-sincra" /> Organizações ({modo === "tipo" ? "por tipo" : "por situação"})
            </h3>
            {Object.entries(legendaOrg).map(([k, v]) => {
              const chave = `o:${k}`;
              const qtd = posicionados.filter((p) => p.legenda === chave).length;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => alternar(chave)}
                  aria-pressed={!ocultos.has(chave)}
                  className={`flex items-center justify-between gap-2 rounded-campo px-2 py-1 text-sm hover:bg-azul-25 ${ocultos.has(chave) ? "opacity-40" : ""}`}
                >
                  <span className="flex items-center gap-2 text-left text-tinta">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: v.cor }} />
                    {v.rotulo}
                  </span>
                  <span className="tabular text-xs font-semibold text-cinza">{qtd}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1 border-t border-linha pt-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-tinta-2">
              <span className="size-2.5 rounded-[3px] bg-tinta" /> Pessoas (por profundidade da relação)
            </h3>
            {Object.entries(COR_PROFUNDIDADE).map(([k, v]) => {
              const chave = `p:${k}`;
              const qtd = pessoasFiltradas.filter((p) => chaveNivel(p.profundidade) === k).length;
              return (
                <button
                  key={chave}
                  type="button"
                  onClick={() => alternar(chave)}
                  aria-pressed={!ocultos.has(chave)}
                  className={`flex items-center justify-between gap-2 rounded-campo px-2 py-1 text-sm hover:bg-azul-25 ${ocultos.has(chave) ? "opacity-40" : ""}`}
                >
                  <span className="flex items-center gap-2 text-left text-tinta">
                    <span className="size-3 shrink-0 rounded-[4px]" style={{ background: v.cor }} />
                    {v.rotulo}
                  </span>
                  <span className="tabular text-xs font-semibold text-cinza">{qtd}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-cinza">
            Círculo: organização. Quadrado: pessoa. Clique numa categoria para mostrar ou esconder. Pulsando: negócio em aberto
            (organização) ou prioridade P1 (pessoa). Borda tracejada: organização sem cidade (centro do estado).
          </p>
        </section>

        <section className="flex flex-col gap-2 rounded-cartao border border-azul-100 bg-azul-25 p-4">
          {org ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-sincra-tinta">Organização · {org.tipoRotulo}</span>
                  <h3 className="text-base font-semibold text-tinta">{org.nome}</h3>
                  <span className="text-xs text-cinza">
                    {org.cidade ? `${org.cidade}/${org.uf}` : org.uf}
                    {org.lat === null && " · posição aproximada"}
                  </span>
                </div>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs font-semibold text-tinta-3">
                  Fechar
                </button>
              </div>
              <dl className="grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Situação</dt>
                  <dd className="font-semibold text-tinta">{COR_SITUACAO[org.situacao]?.rotulo}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Pessoas</dt>
                  <dd className="tabular font-semibold text-tinta">{org.pessoas}</dd>
                </div>
                {org.negocioAberto && <dd className="text-tinta-3">Negócio: {org.negocioAberto}</dd>}
                {org.notas && <dd className="line-clamp-4 text-tinta-3">{org.notas}</dd>}
              </dl>
              <Link href={`/organizacoes/${org.id}`} className="mt-1 rounded-full bg-sincra px-4 py-2 text-center text-sm font-semibold text-white hover:bg-sincra-tinta">
                Abrir organização
              </Link>
            </>
          ) : pessoa ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-tinta-2">Pessoa{pessoa.cargo ? ` · ${pessoa.cargo}` : ""}</span>
                  <h3 className="text-base font-semibold text-tinta">{pessoa.nome}</h3>
                  <span className="text-xs text-cinza">
                    {[pessoa.cidade, pessoa.uf].filter(Boolean).join("/")}
                    {pessoa.natureza && ` · local ${pessoa.natureza}`}
                  </span>
                </div>
                <button type="button" onClick={() => setSelecionado(null)} className="text-xs font-semibold text-tinta-3">
                  Fechar
                </button>
              </div>
              <dl className="grid gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Organização</dt>
                  <dd className="text-right font-semibold text-tinta">{pessoa.organizacao ?? "Sem organização"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Profundidade</dt>
                  <dd className="font-semibold text-tinta">{COR_PROFUNDIDADE[chaveNivel(pessoa.profundidade)].rotulo}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Situação</dt>
                  <dd className="font-semibold text-tinta">{rotuloSituacao(pessoa.situacao)?.rotulo ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-cinza">Prioridade</dt>
                  <dd className="font-semibold text-tinta">{rotuloPrioridade(pessoa.prioridade) ?? "—"}</dd>
                </div>
                {pessoa.proximoPasso && <dd className="text-tinta-3">Próximo passo: {pessoa.proximoPasso}</dd>}
              </dl>
              <Link href={`/contatos/${pessoa.id}`} className="mt-1 rounded-full bg-tinta px-4 py-2 text-center text-sm font-semibold text-white hover:bg-tinta-2">
                Abrir contato
              </Link>
            </>
          ) : (
            <p className="text-sm text-tinta-3">Clique num ponto para ver os detalhes.</p>
          )}
        </section>

        <section className="flex flex-col gap-2 rounded-cartao border border-linha bg-white p-4 shadow-cartao">
          <h2 className="text-sm font-semibold text-tinta">
            Contatos sem localização <span className="tabular text-cinza">({semLocalPessoas.length})</span>
          </h2>
          {semLocalPessoas.length === 0 ? (
            <p className="text-sm text-cinza">Todas as pessoas desta visão têm cidade.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {semLocalPessoas.map((p) => (
                <li key={p.id}>
                  <Link href={`/contatos/${p.id}`} className="flex items-center gap-2 rounded-campo px-1.5 py-1 text-sm hover:bg-azul-25">
                    <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: COR_PROFUNDIDADE[chaveNivel(p.profundidade)].cor }} />
                    <span className="truncate text-tinta">{p.nome}</span>
                    <span className="ml-auto shrink-0 text-xs text-cinza">
                      {[COR_PROFUNDIDADE[chaveNivel(p.profundidade)].rotulo.split(" · ")[0], rotuloPrioridade(p.prioridade)].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-cinza">A posição nunca é deduzida do DDD nem do endereço da organização.</p>
        </section>
      </aside>
    </div>
  );
}
