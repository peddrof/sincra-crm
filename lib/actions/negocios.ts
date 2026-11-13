"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSocio } from "@/lib/auth";
import { lerReaisEmCentavos, lerTaxa } from "@/lib/negocios";
import { createClient } from "@/lib/supabase/server";
import { textoOuNulo } from "@/lib/validacao";

export type EstadoNegocio = { erros?: Record<string, string>; mensagem?: string; valores?: Record<string, string> };

// O evento no feed (criado, movido, atualizado) e o status (aberto/ganho/perdido) saem dos gatilhos do banco.

export async function salvarNegocio(_anterior: EstadoNegocio, formData: FormData): Promise<EstadoNegocio> {
  await getSocio();
  const valores: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (!k.startsWith("$")) valores[k] = String(v);
  });
  const erros: Record<string, string> = {};

  const id = textoOuNulo(formData.get("id"));
  const organizacaoId = textoOuNulo(formData.get("organization_id"));
  const funilId = textoOuNulo(formData.get("pipeline_id"));
  const etapaId = textoOuNulo(formData.get("stage_id"));
  const titulo = textoOuNulo(formData.get("title"));
  const taxa = lerTaxa(String(formData.get("rate_percent") ?? ""));
  const valor = lerReaisEmCentavos(String(formData.get("amount") ?? ""));
  const previsao = textoOuNulo(formData.get("expected_close_date"));

  if (!organizacaoId) erros.organization_id = "Escolha a organização.";
  if (!funilId) erros.pipeline_id = "Escolha o funil.";
  if (!etapaId) erros.stage_id = "Escolha a etapa.";
  if (!titulo) erros.title = "Dê um nome ao negócio.";
  if (taxa !== null && (Number.isNaN(taxa) || taxa <= 0 || taxa >= 100)) erros.rate_percent = "Taxa inválida. Ex.: 3,5";
  if (valor !== null && Number.isNaN(valor)) erros.amount = "Valor inválido. Ex.: 250.000,00";
  if (previsao && !/^\d{4}-\d{2}-\d{2}$/.test(previsao)) erros.expected_close_date = "Data inválida.";
  if (Object.keys(erros).length) return { erros, valores };

  const dados = {
    organization_id: organizacaoId!,
    pipeline_id: funilId!,
    stage_id: etapaId!,
    title: titulo!,
    owner_id: textoOuNulo(formData.get("owner_id")),
    rate_percent: taxa,
    amount_estimate_cents: valor,
    expected_close_date: previsao,
    notes: textoOuNulo(formData.get("notes")),
  };

  const supabase = await createClient();
  let salvoId = id;
  if (id) {
    const { error } = await supabase.from("deals").update(dados).eq("id", id);
    if (error) return falha(error, valores);
  } else {
    const { data, error } = await supabase.from("deals").insert(dados).select("id").single();
    if (error) return falha(error, valores);
    salvoId = data.id;
  }
  // Volta para onde o negócio foi aberto (ex.: a organização), se for um caminho interno.
  const retorno = textoOuNulo(formData.get("retorno"));
  redirect(retorno && retorno.startsWith("/") && !retorno.startsWith("//") ? retorno : `/negocios/${salvoId}`);
}

// Usado pelo kanban (arrastar) e pela página do negócio (seletor de etapa).
export async function moverNegocio(negocioId: string, etapaId: string): Promise<{ erro?: string }> {
  await getSocio();
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ stage_id: etapaId }).eq("id", negocioId);
  if (error) {
    console.error("[negocios] falha ao mover:", error.code, error.message);
    return { erro: error.code === "23514" ? "Essa etapa é de outro funil." : "Não foi possível mover agora." };
  }
  refresh();
  return {};
}

export async function mudarEtapa(formData: FormData) {
  const negocioId = textoOuNulo(formData.get("deal_id"));
  const etapaId = textoOuNulo(formData.get("stage_id"));
  if (negocioId && etapaId) await moverNegocio(negocioId, etapaId);
}

function falha(error: { code?: string; message: string }, valores: Record<string, string>): EstadoNegocio {
  if (error.code === "23514") return { erros: { stage_id: "Essa etapa é de outro funil." }, valores };
  console.error("[negocios] falha ao salvar:", error.code, error.message);
  return { mensagem: "Não foi possível salvar agora. Tente de novo.", valores };
}

// Pessoas no negócio: qualquer pessoa cadastrada (médica ou não, com ou sem organização).
// Só associa a um negócio que já existe; não cria oportunidade nem mexe em valores ou etapas.
export async function vincularPessoa(formData: FormData) {
  const socio = await getSocio();
  const negocioId = textoOuNulo(formData.get("deal_id"));
  const pessoaId = textoOuNulo(formData.get("person_id"));
  if (!negocioId || !pessoaId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("deal_people")
    .upsert({ deal_id: negocioId, person_id: pessoaId, papel: textoOuNulo(formData.get("papel")) });
  if (error) {
    console.error("[negocios] falha ao ligar pessoa:", error.message);
    return;
  }
  await registrarEventoPessoa(supabase, socio, negocioId, pessoaId, "ligou", "deal.person_linked");
  refresh();
}

export async function desvincularPessoa(formData: FormData) {
  const socio = await getSocio();
  const negocioId = textoOuNulo(formData.get("deal_id"));
  const pessoaId = textoOuNulo(formData.get("person_id"));
  if (!negocioId || !pessoaId) return;
  const supabase = await createClient();
  const { error } = await supabase.from("deal_people").delete().eq("deal_id", negocioId).eq("person_id", pessoaId);
  if (error) {
    console.error("[negocios] falha ao tirar pessoa:", error.message);
    return;
  }
  await registrarEventoPessoa(supabase, socio, negocioId, pessoaId, "tirou", "deal.person_unlinked");
  refresh();
}

async function registrarEventoPessoa(
  supabase: Awaited<ReturnType<typeof createClient>>,
  socio: { id: string; nome: string; apelido: string | null },
  negocioId: string,
  pessoaId: string,
  verbo: "ligou" | "tirou",
  tipo: string,
) {
  const [{ data: negocio }, { data: pessoa }] = await Promise.all([
    supabase.from("deals").select("title, organization_id").eq("id", negocioId).maybeSingle(),
    supabase.from("people").select("full_name").eq("id", pessoaId).maybeSingle(),
  ]);
  if (!negocio || !pessoa) return;
  const quem = socio.apelido ?? socio.nome.split(" ")[0];
  await supabase.from("activity_events").insert({
    actor_type: "user",
    actor_id: socio.id,
    event_type: tipo,
    area: "comercial",
    organization_id: negocio.organization_id,
    entity_type: "deals",
    entity_id: negocioId,
    summary: `${quem} ${verbo} ${pessoa.full_name} ${verbo === "ligou" ? "ao" : "do"} negócio ${negocio.title}`,
  });
}
