"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSocio } from "@/lib/auth";
import { ANEXO_MAX_BYTES, AREAS, apelidoDe, encontrarMencoes, REACOES, type Area } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { textoOuNulo } from "@/lib/validacao";

export type EstadoPost = { erro?: string; valores?: { body?: string; area?: string; organization_id?: string } };

const TEXTO_MAX = 4000;

// Post manual no feed: texto, área, organização opcional, anexo opcional (Storage privado) e menções @apelido.
export async function postar(_anterior: EstadoPost, formData: FormData): Promise<EstadoPost> {
  const socio = await getSocio();
  const body = String(formData.get("body") ?? "").trim();
  const area = String(formData.get("area") ?? "geral") as Area;
  const organizacaoId = textoOuNulo(formData.get("organization_id"));
  const arquivo = formData.get("anexo");
  const valores = { body, area, organization_id: organizacaoId ?? "" };

  if (!body) return { erro: "Escreva a atualização.", valores };
  if (body.length > TEXTO_MAX) return { erro: `Use até ${TEXTO_MAX} caracteres.`, valores };
  if (!AREAS.some((a) => a.valor === area)) return { erro: "Escolha a área.", valores };

  const temAnexo = arquivo instanceof File && arquivo.size > 0;
  if (temAnexo && arquivo.size > ANEXO_MAX_BYTES) return { erro: "O anexo passa de 8 MB.", valores };

  const supabase = await createClient();
  const { data: socios } = await supabase.from("profiles").select("id, full_name, nickname").eq("active", true);
  const mencoes = encontrarMencoes(body, (socios ?? []).map((s) => ({ id: s.id, apelido: apelidoDe(s) })));

  let anexo: { path: string; nome: string; tipo: string; tamanho: number } | null = null;
  if (temAnexo) {
    const nomeSeguro = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
    const path = `${socio.id}/${crypto.randomUUID()}-${nomeSeguro}`;
    const { error } = await supabase.storage
      .from("feed-anexos")
      .upload(path, arquivo, { contentType: arquivo.type || "application/octet-stream" });
    if (error) {
      console.error("[feed] falha no anexo:", error.message);
      return { erro: "Não foi possível enviar o anexo. Tente de novo.", valores };
    }
    anexo = { path, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size };
  }

  const { error } = await supabase.from("activity_events").insert({
    actor_type: "user",
    actor_id: socio.id,
    event_type: "post.created",
    area,
    organization_id: organizacaoId,
    entity_type: organizacaoId ? "organizations" : null,
    entity_id: organizacaoId,
    summary: `${socio.apelido ?? socio.nome.split(" ")[0]} postou uma atualização`,
    body,
    mentions: mencoes,
    payload: anexo ? { anexo } : {},
  });

  if (error) {
    if (anexo) await supabase.storage.from("feed-anexos").remove([anexo.path]);
    console.error("[feed] falha ao postar:", error.code, error.message);
    return { erro: "Não foi possível postar agora. Tente de novo.", valores };
  }

  redirect("/feed");
}

export async function comentar(formData: FormData) {
  const socio = await getSocio();
  const eventoId = textoOuNulo(formData.get("event_id"));
  const body = String(formData.get("body") ?? "").trim().slice(0, TEXTO_MAX);
  if (!eventoId || !body) return;
  const supabase = await createClient();
  const { error } = await supabase.from("event_comments").insert({ event_id: eventoId, author_id: socio.id, body });
  if (error) console.error("[feed] falha ao comentar:", error.message);
  refresh();
}

// Só o autor edita ou apaga (a RLS confere de novo: comentarios_editar / comentarios_apagar).
export async function editarComentario(formData: FormData) {
  const socio = await getSocio();
  const id = textoOuNulo(formData.get("comment_id"));
  const body = String(formData.get("body") ?? "").trim().slice(0, TEXTO_MAX);
  if (!id || !body) return;
  const supabase = await createClient();
  await supabase.from("event_comments").update({ body, editado_em: new Date().toISOString() }).eq("id", id).eq("author_id", socio.id);
  refresh();
}

export async function apagarComentario(formData: FormData) {
  const socio = await getSocio();
  const id = textoOuNulo(formData.get("comment_id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("event_comments").delete().eq("id", id).eq("author_id", socio.id);
  refresh();
}

// Só o próprio post manual (eventos automáticos são o registro do que aconteceu e não se apagam).
export async function apagarPost(formData: FormData) {
  const socio = await getSocio();
  const id = textoOuNulo(formData.get("event_id"));
  if (!id) return;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("activity_events")
    .delete()
    .eq("id", id)
    .eq("actor_id", socio.id)
    .eq("event_type", "post.created")
    .select("payload")
    .maybeSingle();
  const anexo = (post?.payload as { anexo?: { path?: string } } | null)?.anexo?.path;
  if (anexo) await supabase.storage.from("feed-anexos").remove([anexo]);
  refresh();
}

// Liga ou desliga a reação do sócio naquele evento.
export async function reagir(formData: FormData) {
  const socio = await getSocio();
  const eventoId = textoOuNulo(formData.get("event_id"));
  const emoji = String(formData.get("emoji") ?? "");
  if (!eventoId || !(REACOES as readonly string[]).includes(emoji)) return;
  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("event_reactions")
    .select("event_id")
    .eq("event_id", eventoId)
    .eq("profile_id", socio.id)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existente) {
    await supabase.from("event_reactions").delete().eq("event_id", eventoId).eq("profile_id", socio.id).eq("emoji", emoji);
  } else {
    await supabase.from("event_reactions").insert({ event_id: eventoId, profile_id: socio.id, emoji });
  }
  refresh();
}

export async function marcarLido(formData: FormData) {
  const socio = await getSocio();
  const eventoId = textoOuNulo(formData.get("event_id"));
  if (!eventoId) return;
  const supabase = await createClient();
  await supabase
    .from("event_reads")
    .upsert({ event_id: eventoId, profile_id: socio.id }, { onConflict: "event_id,profile_id", ignoreDuplicates: true });
  refresh();
}

export async function marcarTudoLido() {
  const socio = await getSocio();
  const supabase = await createClient();
  const { data: naoLidos } = await supabase.from("feed_eventos").select("id").eq("lido", false).limit(500);
  const linhas = (naoLidos ?? []).flatMap((e) => (e.id ? [{ event_id: e.id, profile_id: socio.id }] : []));
  if (linhas.length) {
    await supabase.from("event_reads").upsert(linhas, { onConflict: "event_id,profile_id", ignoreDuplicates: true });
  }
  refresh();
}
