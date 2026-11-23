"use server";

import { refresh } from "next/cache";
import { getSocio } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ANDAMENTOS, isoValido, PRIORIDADES_TAREFA, type Andamento } from "@/lib/tarefas";
import { textoOuNulo } from "@/lib/validacao";

export type EstadoTarefa = { erro?: string; ok?: number };
type Resultado = { erro?: string };

// Os eventos do feed (criou, pediu, agendou, remarcou, mudou o andamento, concluiu) saem do gatilho do banco
// (private.registrar_evento_tarefa). Lixeira não gera evento.

const PRIORIDADES_OK = new Set<string>(PRIORIDADES_TAREFA.map((p) => p.valor));

// Tarefa para si: vai direto para o dia escolhido.
// Tarefa para outro sócio: vira pedido. A data escolhida fica como data pedida e a tarefa nasce em
// "A agendar"; quem recebeu arrasta para o dia em que consegue entregar.
export async function criarTarefa(anterior: EstadoTarefa, formData: FormData): Promise<EstadoTarefa> {
  const socio = await getSocio();
  const titulo = textoOuNulo(formData.get("title"));
  const dia = textoOuNulo(formData.get("due_date"));
  const inicio = textoOuNulo(formData.get("start_date"));
  const prioridade = textoOuNulo(formData.get("prioridade")) ?? "normal";
  if (!titulo) return { erro: "Escreva a tarefa." };
  if (titulo.length > 300) return { erro: "Use até 300 caracteres." };
  if (dia && !isoValido(dia)) return { erro: "Data inválida." };
  if (inicio && !isoValido(inicio)) return { erro: "Início inválido." };
  if (!PRIORIDADES_OK.has(prioridade)) return { erro: "Prioridade inválida." };

  const responsavel = textoOuNulo(formData.get("assignee_id")) ?? socio.id;
  const pedido = responsavel !== socio.id;
  const entrega = pedido ? null : dia;
  if (inicio && entrega && inicio > entrega) return { erro: "O início tem de ser antes da entrega." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: titulo,
    description: textoOuNulo(formData.get("description")),
    assignee_id: responsavel,
    due_date: entrega,
    start_date: pedido ? null : inicio,
    requested_date: pedido ? dia : null,
    prioridade,
    organization_id: textoOuNulo(formData.get("organization_id")),
    deal_id: textoOuNulo(formData.get("deal_id")),
  });
  if (error) {
    console.error("[tarefas] falha ao criar:", error.code, error.message);
    return { erro: "Não foi possível criar a tarefa agora." };
  }
  refresh();
  return { ok: (anterior.ok ?? 0) + 1 };
}

// Lê a tarefa (fora da lixeira). Igual a Negócios: qualquer sócio muda dia e andamento.
async function carregarTarefa(id: string) {
  const socio = await getSocio();
  const supabase = await createClient();
  const { data: tarefa } = await supabase
    .from("tasks")
    .select("assignee_id, status, start_date, due_date")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!tarefa) return { erro: "Tarefa não encontrada." } as const;
  return { tarefa, socio, supabase } as const;
}

// Move a tarefa no quadro da semana (dia = null volta para "A agendar").
// Tarefa de vários dias anda inteira: o início acompanha a entrega.
export async function moverTarefa(id: string, dia: string | null): Promise<Resultado> {
  if (dia !== null && !isoValido(dia)) return { erro: "Data inválida." };
  const r = await carregarTarefa(id);
  if ("erro" in r) return { erro: r.erro };
  const { tarefa, socio, supabase } = r;
  if (tarefa.status !== "aberta") return { erro: "Reabra a tarefa antes de mudar o dia." };
  let inicio: string | null = tarefa.start_date;
  if (inicio && tarefa.due_date && dia) {
    const desloc = (Date.parse(dia) - Date.parse(tarefa.due_date)) / 86_400_000;
    const d = new Date(Date.parse(inicio) + desloc * 86_400_000);
    inicio = d.toISOString().slice(0, 10);
  } else if (!dia) {
    inicio = null;
  }
  const { error } = await supabase
    .from("tasks")
    // Tarefa sem responsável passa a ser de quem a moveu; com responsável, ele continua o mesmo.
    .update({ due_date: dia, start_date: inicio, ...(tarefa.assignee_id ? {} : { assignee_id: socio.id }) })
    .eq("id", id);
  if (error) {
    console.error("[tarefas] falha ao mover:", error.message);
    return { erro: "Não foi possível mover agora." };
  }
  refresh();
  return {};
}

// Muda o andamento (Para começar, Em andamento, Pausada, Concluída).
export async function mudarAndamento(id: string, andamento: Andamento): Promise<Resultado> {
  if (!ANDAMENTOS.some((a) => a.valor === andamento)) return { erro: "Andamento inválido." };
  const r = await carregarTarefa(id);
  if ("erro" in r) return { erro: r.erro };
  const dados =
    andamento === "concluida"
      ? { status: "concluida" as const }
      : { status: "aberta" as const, progresso: andamento };
  const { error } = await r.supabase.from("tasks").update(dados).eq("id", id);
  if (error) {
    console.error("[tarefas] falha ao mudar andamento:", error.message);
    return { erro: "Não foi possível mudar o andamento agora." };
  }
  refresh();
  return {};
}

// Conclui ou reabre (caixinha do cartão). Reabrir volta para "Em andamento".
export async function alternarTarefa(formData: FormData) {
  const id = textoOuNulo(formData.get("task_id"));
  if (!id) return;
  await mudarAndamento(id, formData.get("concluir") === "1" ? "concluida" : "em_andamento");
}

// Edição pelo painel da tarefa: qualquer sócio. Data pedida: só quem pediu.
export async function salvarDetalhesTarefa(anterior: EstadoTarefa, formData: FormData): Promise<EstadoTarefa> {
  const socio = await getSocio();
  const id = textoOuNulo(formData.get("task_id"));
  const titulo = textoOuNulo(formData.get("title"));
  const prioridade = textoOuNulo(formData.get("prioridade")) ?? "normal";
  if (!id) return { erro: "Tarefa não encontrada." };
  if (!titulo) return { erro: "Escreva a tarefa." };
  if (titulo.length > 300) return { erro: "Use até 300 caracteres." };
  if (!PRIORIDADES_OK.has(prioridade)) return { erro: "Prioridade inválida." };

  const supabase = await createClient();
  const { data: tarefa } = await supabase.from("tasks").select("assignee_id, created_by").eq("id", id).maybeSingle();
  if (!tarefa) return { erro: "Tarefa não encontrada." };

  const dados: {
    title: string;
    description: string | null;
    prioridade: string;
    start_date?: string | null;
    due_date?: string | null;
    requested_date?: string | null;
  } = { title: titulo, description: textoOuNulo(formData.get("description")), prioridade };

  {
    const inicio = textoOuNulo(formData.get("start_date"));
    const entrega = textoOuNulo(formData.get("due_date"));
    if ((inicio && !isoValido(inicio)) || (entrega && !isoValido(entrega))) return { erro: "Data inválida." };
    if (inicio && entrega && inicio > entrega) return { erro: "O início tem de ser antes da entrega." };
    if (inicio && !entrega) return { erro: "Com início, informe também a entrega." };
    dados.start_date = inicio;
    dados.due_date = entrega;
  }
  if (formData.has("requested_date") && tarefa.created_by === socio.id) {
    const pedida = textoOuNulo(formData.get("requested_date"));
    if (pedida && !isoValido(pedida)) return { erro: "Data pedida inválida." };
    dados.requested_date = pedida;
  }

  const { error } = await supabase.from("tasks").update(dados).eq("id", id);
  if (error) {
    console.error("[tarefas] falha ao salvar detalhes:", error.message);
    return { erro: "Não foi possível salvar agora." };
  }
  refresh();
  return { ok: (anterior.ok ?? 0) + 1 };
}

// Etapas (checklist) — qualquer sócio.
export async function adicionarEtapa(taskId: string, titulo: string): Promise<Resultado> {
  await getSocio();
  const t = titulo.trim();
  if (!t) return { erro: "Escreva a etapa." };
  if (t.length > 300) return { erro: "Use até 300 caracteres." };
  const supabase = await createClient();
  const { count } = await supabase.from("task_steps").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  const { error } = await supabase.from("task_steps").insert({ task_id: taskId, title: t, position: count ?? 0 });
  if (error) {
    console.error("[tarefas] falha ao criar etapa:", error.message);
    return { erro: "Não foi possível criar a etapa." };
  }
  refresh();
  return {};
}

export async function alternarEtapa(etapaId: string, feita: boolean): Promise<Resultado> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("task_steps").update({ done: feita }).eq("id", etapaId);
  if (error) return { erro: "Não foi possível marcar a etapa." };
  refresh();
  return {};
}

export async function removerEtapa(etapaId: string): Promise<Resultado> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("task_steps").delete().eq("id", etapaId);
  if (error) return { erro: "Não foi possível tirar a etapa." };
  refresh();
  return {};
}

// Lixeira: some do quadro e das listas, mas dá para restaurar. Só quem pediu ou quem recebeu manda para a lixeira.
export async function moverParaLixeira(id: string): Promise<Resultado> {
  const socio = await getSocio();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString(), deleted_by: socio.id })
    .eq("id", id)
    .or(`created_by.eq.${socio.id},assignee_id.eq.${socio.id},assignee_id.is.null`)
    .select("id");
  if (error) return { erro: "Não foi possível mandar para a lixeira." };
  if (!data?.length) return { erro: "Só quem pediu ou quem é responsável manda esta tarefa para a lixeira." };
  refresh();
  return {};
}

export async function restaurarTarefa(id: string): Promise<Resultado> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ deleted_at: null, deleted_by: null }).eq("id", id);
  if (error) return { erro: "Não foi possível restaurar." };
  refresh();
  return {};
}

// Apagar de vez: só o que já está na lixeira. Leva as etapas junto.
export async function apagarDeVez(id: string): Promise<Resultado> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id).not("deleted_at", "is", null);
  if (error) {
    console.error("[tarefas] falha ao apagar:", error.message);
    return { erro: "Não foi possível apagar." };
  }
  refresh();
  return {};
}

export async function esvaziarLixeira(): Promise<Resultado> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().not("deleted_at", "is", null);
  if (error) {
    console.error("[tarefas] falha ao esvaziar:", error.message);
    return { erro: "Não foi possível esvaziar a lixeira." };
  }
  refresh();
  return {};
}
