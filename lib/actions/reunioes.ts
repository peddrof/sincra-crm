"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSocio } from "@/lib/auth";
import { lerTextoLocal, metadadosLocais, PREFIXO } from "@/lib/drive-local";
import { lerTexto, metadados } from "@/lib/google/drive";
import { extrairReuniao } from "@/lib/ia/extracao";
import { apelidoDe } from "@/lib/feed";
import { hojeIso } from "@/lib/datas";
import { CONTEXTOS, type Contexto } from "@/lib/reunioes";
import { createClient } from "@/lib/supabase/server";
import { emailValido, textoOuNulo } from "@/lib/validacao";
import type { Json } from "@/lib/supabase/database.types";

export type EstadoReuniao = { erro?: string };

// Fluxo (docs/02, "Reunião → contrato"): transcrição → IA local extrai → sócio confirma → CRM atualiza.
// A transcrição em si não é guardada no banco (fica no Drive); só o resultado confirmado.
// Contexto (pedido de 11/11/2026): reunião com organização, interna (só sócios) ou com o fundo.

function lerTranscricao(arquivo: { id: string; mimeType?: string }): Promise<string> {
  return arquivo.id.startsWith(PREFIXO)
    ? lerTextoLocal(arquivo.id)
    : lerTexto({ id: arquivo.id, mimeType: arquivo.mimeType ?? "text/plain" });
}

function descreverParaIa(contexto: string, organizacao: string | null): string {
  if (contexto === "interna") return "uma reunião interna entre os sócios da Sincra";
  if (contexto === "fundo") return `o fundo parceiro da Sincra${organizacao ? ` (${organizacao})` : ""}`;
  return organizacao ?? "organização não informada";
}

async function processar(interacaoId: string, obterTexto: () => Promise<string>) {
  const supabase = await createClient();
  try {
    const { data: r } = await supabase
      .from("interactions")
      .select("contexto, organization:organizations(trade_name)")
      .eq("id", interacaoId)
      .maybeSingle();
    const { data: socios } = await supabase.from("profiles").select("full_name, nickname").eq("active", true);
    const texto = await obterTexto();
    if (texto.trim().length < 50) throw new Error("A transcrição está vazia ou curta demais.");

    const { extracao, cortada } = await extrairReuniao(texto, {
      organizacao: descreverParaIa(r?.contexto ?? "organizacao", r?.organization?.trade_name ?? null),
      socios: (socios ?? []).map(apelidoDe),
      hoje: hojeIso(),
    });
    await supabase
      .from("interactions")
      .update({ status: "revisar", extraction: { ...extracao, cortada } as unknown as Json, error: null })
      .eq("id", interacaoId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[reunioes] falha ao processar:", interacaoId, msg);
    await supabase.from("interactions").update({ status: "erro", error: msg.slice(0, 500) }).eq("id", interacaoId);
  }
}

// Lê contexto/organização/negócio do formulário e valida: organização só é obrigatória no contexto "organizacao".
function lerVinculo(formData: FormData): { erro?: string; contexto: Contexto; organizacaoId: string | null; negocioId: string | null } {
  const contexto = (String(formData.get("contexto") ?? "organizacao") as Contexto);
  const organizacaoId = textoOuNulo(formData.get("organization_id"));
  if (!CONTEXTOS.some((c) => c.valor === contexto)) return { erro: "Tipo de reunião inválido.", contexto: "organizacao", organizacaoId, negocioId: null };
  if (contexto === "organizacao" && !organizacaoId) {
    return { erro: "Escolha a organização da reunião.", contexto, organizacaoId, negocioId: null };
  }
  return {
    contexto,
    organizacaoId: contexto === "interna" ? null : organizacaoId,
    negocioId: contexto === "interna" ? null : textoOuNulo(formData.get("deal_id")),
  };
}

// Reunião já agendada que agora recebe a transcrição: atualiza em vez de criar outra.
async function salvarParaProcessar(
  formData: FormData,
  dados: { title: string; drive_file_id?: string; occurred_at?: string },
): Promise<{ erro?: string; id?: string }> {
  const vinculo = lerVinculo(formData);
  if (vinculo.erro) return { erro: vinculo.erro };
  const existente = textoOuNulo(formData.get("interaction_id"));
  const supabase = await createClient();

  if (existente) {
    const { error } = await supabase
      .from("interactions")
      .update({ status: "processando", error: null, drive_file_id: dados.drive_file_id ?? null })
      .eq("id", existente)
      .in("status", ["agendada", "erro"]);
    if (error) return { erro: error.code === "23505" ? "Essa transcrição já foi importada." : "Não foi possível importar agora." };
    return { id: existente };
  }

  const { data, error } = await supabase
    .from("interactions")
    .insert({
      type: "reuniao",
      status: "processando",
      title: dados.title,
      drive_file_id: dados.drive_file_id ?? null,
      occurred_at: dados.occurred_at,
      contexto: vinculo.contexto,
      organization_id: vinculo.organizacaoId,
      deal_id: vinculo.negocioId,
    })
    .select("id")
    .single();
  if (error) return { erro: error.code === "23505" ? "Essa transcrição já foi importada." : "Não foi possível importar agora." };
  return { id: data.id };
}

// Transcrição que está na pasta do Drive (sincronizada no PC ou pela API).
export async function importarDoDrive(_anterior: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  await getSocio();
  const arquivoId = textoOuNulo(formData.get("drive_file_id"));
  if (!arquivoId) return { erro: "Arquivo não encontrado." };

  let arquivo: { id: string; name: string; modifiedTime: string; mimeType?: string };
  try {
    arquivo = arquivoId.startsWith(PREFIXO) ? await metadadosLocais(arquivoId) : await metadados(arquivoId);
  } catch {
    return { erro: "Não foi possível ler o arquivo no Drive." };
  }

  const r = await salvarParaProcessar(formData, { title: arquivo.name, drive_file_id: arquivo.id, occurred_at: arquivo.modifiedTime });
  if (r.erro || !r.id) return { erro: r.erro };
  const id = r.id;
  after(() => processar(id, () => lerTranscricao(arquivo)));
  redirect(`/reunioes/${id}`);
}

// Transcrição colada à mão.
export async function importarTexto(_anterior: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  await getSocio();
  const texto = String(formData.get("texto") ?? "");
  if (texto.trim().length < 50) return { erro: "Cole a transcrição completa." };

  const r = await salvarParaProcessar(formData, { title: textoOuNulo(formData.get("title")) ?? "Reunião" });
  if (r.erro || !r.id) return { erro: r.erro };
  const id = r.id;
  after(() => processar(id, async () => texto));
  redirect(`/reunioes/${id}`);
}

// Só para as do Drive (o texto colado não é guardado).
export async function reprocessar(formData: FormData) {
  await getSocio();
  const id = textoOuNulo(formData.get("interaction_id"));
  if (!id) return;
  const supabase = await createClient();
  const { data: r } = await supabase.from("interactions").select("drive_file_id").eq("id", id).maybeSingle();
  if (!r?.drive_file_id) return;
  await supabase.from("interactions").update({ status: "processando", error: null }).eq("id", id);
  const arquivoId = r.drive_file_id;
  after(() =>
    processar(id, async () =>
      arquivoId.startsWith(PREFIXO) ? lerTextoLocal(arquivoId) : lerTexto(await metadados(arquivoId)),
    ),
  );
  refresh();
}

export async function descartar(formData: FormData) {
  await getSocio();
  const id = textoOuNulo(formData.get("interaction_id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("interactions").delete().eq("id", id).neq("status", "confirmada");
  redirect("/reunioes");
}

// Agenda uma reunião (pedido de 11/11/2026). Fica registrada na plataforma, entra no feed mencionando os
// sócios convidados e a página dela oferece "Adicionar ao Google Agenda" e o convite .ics.
export async function agendar(_anterior: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  const socio = await getSocio();
  const vinculo = lerVinculo(formData);
  if (vinculo.erro) return { erro: vinculo.erro };
  const titulo = textoOuNulo(formData.get("title"));
  const data = textoOuNulo(formData.get("data"));
  const hora = textoOuNulo(formData.get("hora"));
  const duracao = Number(formData.get("duracao") ?? 60);
  if (!titulo) return { erro: "Dê um título à reunião." };
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !hora || !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Informe data e hora." };
  if (!Number.isInteger(duracao) || duracao < 10 || duracao > 600) return { erro: "Duração inválida." };

  const convidados = [
    ...formData.getAll("participante").map(String),
    ...String(formData.get("outros_emails") ?? "").split(/[\s,;]+/),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter((e, i, todos) => e && emailValido(e) && todos.indexOf(e) === i);
  const sociosConvidados = formData.getAll("socio").map(String).filter((id) => id !== socio.id);

  const supabase = await createClient();
  const { data: reuniao, error } = await supabase
    .from("interactions")
    .insert({
      type: "reuniao",
      status: "agendada",
      title: titulo,
      contexto: vinculo.contexto,
      organization_id: vinculo.organizacaoId,
      deal_id: vinculo.negocioId,
      occurred_at: `${data}T${hora}:00-03:00`,
      duracao_minutos: duracao,
      local: textoOuNulo(formData.get("local")),
      participantes: convidados,
      summary: textoOuNulo(formData.get("notas")),
    })
    .select("id, organization:organizations(trade_name)")
    .single();
  if (error) {
    console.error("[reunioes] falha ao agendar:", error.message);
    return { erro: "Não foi possível agendar agora." };
  }

  const [a, m, d] = data.split("-");
  const com =
    vinculo.contexto === "interna"
      ? "reunião interna"
      : vinculo.contexto === "fundo"
        ? `reunião com o fundo${reuniao.organization ? ` (${reuniao.organization.trade_name})` : ""}`
        : `reunião com ${reuniao.organization?.trade_name ?? "cliente"}`;
  await supabase.from("activity_events").insert({
    actor_type: "user",
    actor_id: socio.id,
    event_type: "meeting.scheduled",
    area: vinculo.contexto === "fundo" ? "fundo" : vinculo.contexto === "interna" ? "geral" : "comercial",
    entity_type: "interactions",
    entity_id: reuniao.id,
    organization_id: vinculo.organizacaoId,
    summary: `${socio.apelido ?? socio.nome.split(" ")[0]} agendou ${com} para ${d}/${m}/${a}, ${hora}`,
    mentions: sociosConvidados,
  });

  redirect(`/reunioes/${reuniao.id}`);
}

// O sócio revisou: grava só o que ficou marcado. Tarefas, decisões e pessoas novas entram no CRM.
export async function confirmar(_anterior: EstadoReuniao, formData: FormData): Promise<EstadoReuniao> {
  const socio = await getSocio();
  const id = textoOuNulo(formData.get("interaction_id"));
  const resumo = textoOuNulo(formData.get("resumo"));
  if (!id) return { erro: "Reunião não encontrada." };
  if (!resumo) return { erro: "Escreva o resumo da reunião." };

  const supabase = await createClient();
  const { data: r } = await supabase
    .from("interactions")
    .select("id, title, status, contexto, organization_id, deal_id, organization:organizations(trade_name)")
    .eq("id", id)
    .maybeSingle();
  if (!r || r.status !== "revisar") return { erro: "Esta reunião não está aguardando revisão." };

  const linhas = (prefixo: string) =>
    [...formData.keys()].filter((k) => k.startsWith(`${prefixo}_incluir_`)).map((k) => k.slice(`${prefixo}_incluir_`.length));

  const decisoes = linhas("decisao")
    .map((i) => textoOuNulo(formData.get(`decisao_texto_${i}`)))
    .filter((t): t is string => Boolean(t))
    .map((description) => ({ description, decided_by: socio.id, organization_id: r.organization_id, deal_id: r.deal_id }));

  const tarefas = linhas("passo").flatMap((i) => {
    const title = textoOuNulo(formData.get(`passo_texto_${i}`));
    const prazo = textoOuNulo(formData.get(`passo_prazo_${i}`));
    if (!title) return [];
    return [
      {
        title: title.slice(0, 300),
        assignee_id: textoOuNulo(formData.get(`passo_resp_${i}`)) ?? socio.id,
        due_date: prazo && /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : null,
        organization_id: r.organization_id,
        deal_id: r.deal_id,
      },
    ];
  });

  // Pessoas só entram quando a reunião é com uma organização (precisam de onde ficar).
  const pessoas = r.organization_id
    ? linhas("pessoa").flatMap((i) => {
        const full_name = textoOuNulo(formData.get(`pessoa_nome_${i}`));
        const email = textoOuNulo(formData.get(`pessoa_email_${i}`))?.toLowerCase() ?? null;
        if (!full_name) return [];
        return [
          {
            full_name,
            role_title: textoOuNulo(formData.get(`pessoa_cargo_${i}`)),
            email: email && emailValido(email) ? email : null,
            phone: textoOuNulo(formData.get(`pessoa_tel_${i}`)),
            organization_id: r.organization_id,
          },
        ];
      })
    : [];

  if (decisoes.length) {
    const { error } = await supabase.from("decisions").insert(decisoes);
    if (error) return { erro: "Não foi possível gravar as decisões." };
  }
  if (tarefas.length) {
    const { error } = await supabase.from("tasks").insert(tarefas);
    if (error) return { erro: "Não foi possível criar as tarefas." };
  }
  if (pessoas.length) {
    const { error } = await supabase.from("people").insert(pessoas);
    if (error) return { erro: "Não foi possível cadastrar as pessoas." };
  }

  const { error } = await supabase
    .from("interactions")
    .update({ status: "confirmada", summary: resumo, confirmed_by: socio.id, confirmed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { erro: "Não foi possível confirmar agora." };

  const partes = [
    tarefas.length && `${tarefas.length} ${tarefas.length === 1 ? "próximo passo" : "próximos passos"}`,
    decisoes.length && `${decisoes.length} ${decisoes.length === 1 ? "decisão" : "decisões"}`,
    pessoas.length && `${pessoas.length} ${pessoas.length === 1 ? "pessoa nova" : "pessoas novas"}`,
  ].filter(Boolean);
  const com =
    r.contexto === "interna"
      ? "a reunião interna"
      : r.contexto === "fundo"
        ? `a reunião com o fundo${r.organization ? ` (${r.organization.trade_name})` : ""}`
        : `a reunião com ${r.organization?.trade_name ?? "cliente"}`;
  await supabase.from("activity_events").insert({
    actor_type: "user",
    actor_id: socio.id,
    event_type: "meeting.confirmed",
    area: r.contexto === "fundo" ? "fundo" : r.contexto === "interna" ? "geral" : "comercial",
    entity_type: "interactions",
    entity_id: r.id,
    organization_id: r.organization_id,
    summary: `${socio.apelido ?? socio.nome.split(" ")[0]} registrou ${com}` + (partes.length ? `: ${partes.join(", ")}` : ""),
    body: resumo,
  });

  redirect(`/reunioes/${id}`);
}
