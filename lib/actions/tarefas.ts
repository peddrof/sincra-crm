"use server";

import { refresh } from "next/cache";
import { getSocio } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { textoOuNulo } from "@/lib/validacao";

export type EstadoTarefa = { erro?: string; ok?: number };

// Os eventos "criou a tarefa" e "concluiu a tarefa" saem do gatilho do banco.

export async function criarTarefa(anterior: EstadoTarefa, formData: FormData): Promise<EstadoTarefa> {
  const socio = await getSocio();
  const titulo = textoOuNulo(formData.get("title"));
  const prazo = textoOuNulo(formData.get("due_date"));
  if (!titulo) return { erro: "Escreva a tarefa." };
  if (titulo.length > 300) return { erro: "Use até 300 caracteres." };
  if (prazo && !/^\d{4}-\d{2}-\d{2}$/.test(prazo)) return { erro: "Prazo inválido." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: titulo,
    description: textoOuNulo(formData.get("description")),
    assignee_id: textoOuNulo(formData.get("assignee_id")) ?? socio.id,
    due_date: prazo,
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

// Conclui ou reabre.
export async function alternarTarefa(formData: FormData) {
  await getSocio();
  const id = textoOuNulo(formData.get("task_id"));
  const concluir = formData.get("concluir") === "1";
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: concluir ? "concluida" : "aberta" })
    .eq("id", id);
  if (error) console.error("[tarefas] falha ao alterar:", error.message);
  refresh();
}
