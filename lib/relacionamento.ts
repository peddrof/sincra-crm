import type { StatusTipo } from "@/components/StatusPill";

// Régua de relacionamento com pessoas (complemento de 11/11/2026).
// Profundidade, situação e prioridade são independentes: uma relação pode ser forte (N3) e estar inativa.

export const PROFUNDIDADES = [
  { valor: 3, rotulo: "N3 · Colaboração contínua", curto: "N3", ajuda: "Atuação recorrente e concreta: sociedade, parceria em negociação, trabalho operacional." },
  { valor: 2, rotulo: "N2 · Conversa substantiva", curto: "N2", ajuda: "Reunião ou troca substantiva comprovada, com contexto para retomar." },
  { valor: 1, rotulo: "N1 · Interação inicial", curto: "N1", ajuda: "Houve resposta, mas pouco aprofundamento ou abertura incerta." },
  { valor: 0, rotulo: "N0 · Vínculo não demonstrado", curto: "N0", ajuda: "Só nome salvo, menção indireta ou tentativa sem retorno." },
] as const;

export const SITUACOES = [
  { valor: "ativa", rotulo: "Ativa", tipo: "concluido" },
  { valor: "retomavel", rotulo: "Retomável pelo histórico", tipo: "andamento" },
  { valor: "em_aberto", rotulo: "Em aberto, revalidar", tipo: "atencao" },
  { valor: "sem_resposta", rotulo: "Sem resposta visível", tipo: "neutro" },
  { valor: "recusa", rotulo: "Recusa à oferta", tipo: "neutro" },
  { valor: "recusa_grosseira", rotulo: "Recusa grosseira", tipo: "critico" },
  { valor: "evidencia_insuficiente", rotulo: "Evidência insuficiente", tipo: "neutro" },
] as const satisfies readonly { valor: string; rotulo: string; tipo: StatusTipo }[];

export const PRIORIDADES = [
  { valor: 1, rotulo: "P1 · Continuidade atual", curto: "P1" },
  { valor: 2, rotulo: "P2 · Retomada com contexto", curto: "P2" },
  { valor: 3, rotulo: "P3 · Revisar antes de retomar", curto: "P3" },
] as const;

export const TIPOS_RELACAO = [
  { valor: "comercial", rotulo: "Comercial (hospital, clínica, médico)" },
  { valor: "parceiro", rotulo: "Parceiro ou fundo" },
  { valor: "prestador", rotulo: "Prestador (advogado, contador)" },
  { valor: "mentor", rotulo: "Mentor" },
  { valor: "ponte", rotulo: "Ponte ou indicação" },
  { valor: "interno", rotulo: "Interno da Sincra" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export const NATUREZAS_LOCAL = [
  { valor: "profissional", rotulo: "Local profissional" },
  { valor: "pessoal", rotulo: "Local pessoal" },
] as const;

export type Visao = "principal" | "revisao" | "fora";

export const VISOES: { valor: Visao | "todas"; rotulo: string; ajuda: string }[] = [
  { valor: "principal", rotulo: "Visão principal", ajuda: "Relações com conversa comprovada (N1 a N3), sem pendência de confirmação." },
  { valor: "revisao", rotulo: "Fila de revisão", ajuda: "Confirmação pendente ou ainda sem classificação. Não ganham destaque automático." },
  { valor: "fora", rotulo: "Fora da visão principal", ajuda: "Sem resposta visível, recusas e vínculos não demonstrados. O histórico continua guardado." },
  { valor: "todas", rotulo: "Todas", ajuda: "Todas as pessoas cadastradas." },
];

const SITUACOES_FORA = new Set(["sem_resposta", "recusa", "recusa_grosseira", "evidencia_insuficiente"]);

type Classificacao = { profundidade: number | null; situacao: string | null; confirmacao_pendente: boolean };

// Em qual visão a pessoa aparece. Sem resposta e recusas saem da visão principal (sem apagar nada);
// confirmação pendente ou ausência de classificação vão para a fila de revisão.
export function visaoDaPessoa(p: Classificacao): Visao {
  if (p.profundidade === 0 || (p.situacao && SITUACOES_FORA.has(p.situacao))) return "fora";
  if (p.confirmacao_pendente || p.profundidade === null) return "revisao";
  return "principal";
}

export function rotuloProfundidade(v: number | null): string | null {
  return PROFUNDIDADES.find((p) => p.valor === v)?.curto ?? null;
}
export function rotuloSituacao(v: string | null): { rotulo: string; tipo: StatusTipo } | null {
  return SITUACOES.find((s) => s.valor === v) ?? null;
}
export function rotuloPrioridade(v: number | null): string | null {
  return PRIORIDADES.find((p) => p.valor === v)?.curto ?? null;
}
export function rotuloTipoRelacao(v: string | null): string | null {
  return TIPOS_RELACAO.find((t) => t.valor === v)?.rotulo ?? null;
}

// Cores das pessoas no mapa e no grafo: tons de Tinta (paleta do brandbook), para não se confundirem com as
// organizações, que usam azuis, verde e âmbar. Mais escuro = relação mais profunda.
// Chaves com letra para manter a ordem N3 → N0 (chaves numéricas seriam reordenadas pelo JavaScript).
export const chaveNivel = (p: number | null | undefined) => (p === null || p === undefined ? "sem" : `n${p}`);

export const COR_PROFUNDIDADE: Record<string, { cor: string; rotulo: string }> = {
  n3: { cor: "#13161F", rotulo: "N3 · Colaboração contínua" },
  n2: { cor: "#2F3440", rotulo: "N2 · Conversa substantiva" },
  n1: { cor: "#6A7180", rotulo: "N1 · Interação inicial" },
  n0: { cor: "#B4BAC4", rotulo: "N0 · Vínculo não demonstrado" },
  sem: { cor: "#D3D8DF", rotulo: "Sem classificação" },
};

type LinhaPessoa = {
  id: string;
  organization_id: string | null;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  crm_number: string | null;
  can_sign: boolean;
  signing_evidence_document_id: string | null;
  notes: string | null;
  relacao_tipo: string | null;
  profundidade: number | null;
  situacao: string | null;
  prioridade: number | null;
  ultima_interacao: string | null;
  confirmacao_pendente: boolean;
  motivo_classificacao: string | null;
  proximo_passo: string | null;
  canal_contato: string | null;
  fontes: string | null;
  cidade: string | null;
  uf: string | null;
  natureza_local: string | null;
};

// Linha do banco → valores iniciais do formulário de pessoa (tudo em texto).
export function valoresDaPessoa(p: LinhaPessoa) {
  const t = (v: string | number | null) => (v === null ? "" : String(v));
  return {
    id: p.id,
    organization_id: t(p.organization_id),
    full_name: p.full_name,
    role_title: t(p.role_title),
    email: t(p.email),
    phone: t(p.phone),
    crm_number: t(p.crm_number),
    can_sign: p.can_sign ? "on" : "",
    signing_evidence_document_id: t(p.signing_evidence_document_id),
    notes: t(p.notes),
    relacao_tipo: t(p.relacao_tipo),
    profundidade: t(p.profundidade),
    situacao: t(p.situacao),
    prioridade: t(p.prioridade),
    ultima_interacao: t(p.ultima_interacao),
    confirmacao_pendente: p.confirmacao_pendente ? "on" : "",
    motivo_classificacao: t(p.motivo_classificacao),
    proximo_passo: t(p.proximo_passo),
    canal_contato: t(p.canal_contato),
    fontes: t(p.fontes),
    cidade: t(p.cidade),
    uf: t(p.uf),
    natureza_local: t(p.natureza_local),
  };
}
