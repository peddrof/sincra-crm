import type { Database } from "@/lib/supabase/database.types";

export type Area = Database["public"]["Enums"]["event_area"];

export const AREAS: { valor: Area; rotulo: string }[] = [
  { valor: "comercial", rotulo: "Comercial" },
  { valor: "produto", rotulo: "Produto" },
  { valor: "fundo", rotulo: "Fundo" },
  { valor: "operacao", rotulo: "Operação" },
  { valor: "geral", rotulo: "Geral" },
];

export function rotuloArea(area: Area | null): string {
  return AREAS.find((a) => a.valor === area)?.rotulo ?? "Geral";
}

// Grupos do filtro "Tipo" do feed. `prefixos` casa com o início de event_type.
export const GRUPOS_EVENTO = [
  { valor: "post", rotulo: "Posts dos sócios", prefixos: ["post."] },
  { valor: "crm", rotulo: "Organizações e pessoas", prefixos: ["organization.", "person."] },
  { valor: "negocios", rotulo: "Negócios", prefixos: ["deal."] },
  { valor: "tarefas", rotulo: "Tarefas", prefixos: ["task."] },
  { valor: "documentos", rotulo: "Documentos", prefixos: ["document.", "document_request."] },
  { valor: "alertas", rotulo: "Alertas automáticos", prefixos: ["followup."] },
  { valor: "reunioes", rotulo: "Reuniões", prefixos: ["meeting."] },
  { valor: "config", rotulo: "Configurações e integrações", prefixos: ["settings.", "integration."] },
] as const;

// Reações disponíveis. Emojis em reações e posts são conteúdo dos sócios, não texto da interface.
export const REACOES = ["👍", "👀", "✅", "🎉"] as const;

export const ANEXO_MAX_BYTES = 8 * 1024 * 1024;

export type SocioMencao = { id: string; apelido: string };

export function apelidoDe(perfil: { full_name: string; nickname: string | null }): string {
  return perfil.nickname ?? perfil.full_name.split(" ")[0];
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Menção = "@Apelido" no texto, sem diferenciar maiúscula nem acento ("@joao" acha "João").
export function encontrarMencoes(texto: string, socios: SocioMencao[]): string[] {
  const t = semAcento(texto);
  return socios
    .filter((s) => new RegExp(`@${escaparRegex(semAcento(s.apelido))}(?![\\p{L}\\p{N}_])`, "u").test(t))
    .map((s) => s.id);
}

// Para destacar as menções ao exibir: devolve pedaços de texto marcando quais são "@Apelido".
export function partesComMencoes(texto: string, apelidos: string[]): { texto: string; mencao: boolean }[] {
  if (apelidos.length === 0) return [{ texto, mencao: false }];
  const padrao = new RegExp(`(@(?:${apelidos.map(escaparRegex).join("|")}))(?![\\p{L}\\p{N}_])`, "giu");
  const partes: { texto: string; mencao: boolean }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(padrao)) {
    if (m.index > ultimo) partes.push({ texto: texto.slice(ultimo, m.index), mencao: false });
    partes.push({ texto: m[0], mencao: true });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < texto.length) partes.push({ texto: texto.slice(ultimo), mencao: false });
  return partes;
}

// Link para a entidade de um evento.
export function linkDoEvento(evento: {
  entity_type: string | null;
  entity_id: string | null;
  organization_id: string | null;
}): { href: string; rotulo: string } | null {
  if (evento.entity_type === "organizations" && evento.entity_id) {
    return { href: `/organizacoes/${evento.entity_id}`, rotulo: "Abrir organização" };
  }
  if (evento.entity_type === "people" && evento.organization_id) {
    return { href: `/organizacoes/${evento.organization_id}`, rotulo: "Abrir organização" };
  }
  if (evento.entity_type === "deals" && evento.entity_id) {
    return { href: `/negocios/${evento.entity_id}`, rotulo: "Abrir negócio" };
  }
  if (evento.entity_type === "tasks") {
    return { href: "/tarefas?ver=abertas", rotulo: "Abrir tarefas" };
  }
  if (evento.entity_type === "document_requests" && evento.entity_id && evento.organization_id) {
    return { href: `/organizacoes/${evento.organization_id}/documentos/${evento.entity_id}`, rotulo: "Abrir lista" };
  }
  if (evento.entity_type === "interactions" && evento.entity_id) {
    return { href: `/reunioes/${evento.entity_id}`, rotulo: "Abrir reunião" };
  }
  if (evento.entity_type === "settings") {
    return { href: "/configuracoes", rotulo: "Abrir configurações" };
  }
  return null;
}

export type Anexo = { path: string; nome: string; tipo: string; tamanho: number };

export function anexoDe(payload: unknown): Anexo | null {
  const a = (payload as { anexo?: Anexo } | null)?.anexo;
  return a && typeof a.path === "string" ? a : null;
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
