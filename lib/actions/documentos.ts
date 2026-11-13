"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getSocio } from "@/lib/auth";
import { copiarDocumentoParaDrive } from "@/lib/documentos-drive";
import { TIPOS_ORGANIZACAO, type TipoOrganizacao } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { textoOuNulo } from "@/lib/validacao";

export type EstadoSimples = { erro?: string };

// Eventos (lista aberta, documento recebido/aprovado/recusado) saem dos gatilhos do banco.

// Modelo de lista: um item por linha. Linha começando com "opcional:" vira item opcional.
export async function criarModelo(_anterior: EstadoSimples, formData: FormData): Promise<EstadoSimples> {
  await getSocio();
  const nome = textoOuNulo(formData.get("name"));
  const tipo = textoOuNulo(formData.get("organization_type"));
  const linhas = String(formData.get("items") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const link = textoOuNulo(formData.get("link_formulario"));

  if (!nome) return { erro: "Dê um nome ao modelo." };
  if (linhas.length === 0) return { erro: "Escreva pelo menos um documento, um por linha." };
  if (tipo && !TIPOS_ORGANIZACAO.some((t) => t.valor === tipo)) return { erro: "Tipo inválido." };
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { erro: "O link precisa começar com https://" };

  const supabase = await createClient();
  const { data: modelo, error } = await supabase
    .from("document_checklists")
    .insert({ name: nome, organization_type: (tipo as TipoOrganizacao) ?? null, link_formulario: link })
    .select("id")
    .single();
  if (error) return falha(error);

  const itens = linhas.map((linha, i) => {
    const opcional = /^opcional:/i.test(linha);
    const titulo = linha.replace(/^opcional:\s*/i, "");
    return { checklist_id: modelo.id, title: titulo, required: !opcional, position: i + 1 };
  });
  const { error: erroItens } = await supabase.from("document_checklist_items").insert(itens);
  if (erroItens) return falha(erroItens);

  redirect("/documentos/modelos");
}

export async function salvarLinkModelo(formData: FormData) {
  await getSocio();
  const id = textoOuNulo(formData.get("checklist_id"));
  const link = textoOuNulo(formData.get("link_formulario"));
  if (!id || (link && !/^https?:\/\/\S+$/i.test(link))) return;
  const supabase = await createClient();
  await supabase.from("document_checklists").update({ link_formulario: link }).eq("id", id);
  refresh();
}

export async function arquivarModelo(formData: FormData) {
  await getSocio();
  const id = textoOuNulo(formData.get("checklist_id"));
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("document_checklists").update({ active: false }).eq("id", id);
  refresh();
}

// Abre uma lista de documentos para a organização a partir de um modelo (os itens são copiados).
export async function abrirLista(_anterior: EstadoSimples, formData: FormData): Promise<EstadoSimples> {
  await getSocio();
  const organizacaoId = textoOuNulo(formData.get("organization_id"));
  const modeloId = textoOuNulo(formData.get("checklist_id"));
  const negocioId = textoOuNulo(formData.get("deal_id"));
  if (!organizacaoId) return { erro: "Organização não encontrada." };
  if (!modeloId) return { erro: "Escolha o modelo de lista." };

  const supabase = await createClient();
  const [{ data: modelo }, { data: itens }] = await Promise.all([
    supabase.from("document_checklists").select("id, name, link_formulario").eq("id", modeloId).maybeSingle(),
    supabase.from("document_checklist_items").select("title, description, required, position").eq("checklist_id", modeloId).order("position"),
  ]);
  if (!modelo || !itens?.length) return { erro: "Modelo sem itens." };

  const { data: lista, error } = await supabase
    .from("document_requests")
    .insert({
      organization_id: organizacaoId,
      deal_id: negocioId,
      checklist_id: modelo.id,
      name: textoOuNulo(formData.get("name")) ?? modelo.name,
      link_formulario: modelo.link_formulario,
    })
    .select("id")
    .single();
  if (error) return falha(error);

  const { error: erroItens } = await supabase
    .from("document_request_items")
    .insert(itens.map((i) => ({ ...i, request_id: lista.id })));
  if (erroItens) return falha(erroItens);

  redirect(`/organizacoes/${organizacaoId}/documentos/${lista.id}`);
}

// Chamado pelo navegador depois de enviar o arquivo direto ao Storage (bucket "documentos").
export async function registrarArquivo(dados: {
  itemId: string;
  path: string;
  nome: string;
  tipo: string;
  tamanho: number;
}): Promise<EstadoSimples> {
  await getSocio();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("document_request_items")
    .select("id, request_id, title, request:document_requests(organization_id, deal_id)")
    .eq("id", dados.itemId)
    .maybeSingle();
  if (!item?.request) return { erro: "Item não encontrado." };

  // O arquivo tem de estar na pasta desta organização/lista e existir de fato no Storage.
  const pasta = `${item.request.organization_id}/${item.request_id}/`;
  if (!dados.path.startsWith(pasta)) return { erro: "Arquivo fora da pasta da lista." };
  const { error: naoExiste } = await supabase.storage.from("documentos").createSignedUrl(dados.path, 10);
  if (naoExiste) return { erro: "O arquivo não chegou ao armazenamento. Tente de novo." };

  const { data: doc, error } = await supabase
    .from("documents")
    .insert({
      organization_id: item.request.organization_id,
      deal_id: item.request.deal_id,
      title: `${item.title} — ${dados.nome}`.slice(0, 300),
      mime_type: dados.tipo || null,
      size_bytes: dados.tamanho,
      storage_path: dados.path,
    })
    .select("id")
    .single();
  if (error) return falha(error);

  const { error: erroItem } = await supabase
    .from("document_request_items")
    .update({ status: "recebido", document_id: doc.id, reviewer_comment: null, reviewed_by: null })
    .eq("id", item.id);
  if (erroItem) return falha(erroItem);

  // Com o Google conectado, copia para a pasta do cliente no Drive depois de responder (não trava a tela).
  after(async () => {
    const cliente = await createClient();
    await copiarDocumentoParaDrive(cliente, doc.id);
  });

  refresh();
  return {};
}

export async function revisarItem(formData: FormData) {
  const socio = await getSocio();
  const itemId = textoOuNulo(formData.get("item_id"));
  const decisao = String(formData.get("decisao") ?? "");
  const comentario = textoOuNulo(formData.get("comentario"));
  const status = decisao === "aprovar" ? "aprovado" : decisao === "recusar" ? "rejeitado" : decisao === "reabrir" ? "pendente" : null;
  if (!itemId || !status) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_request_items")
    .update({
      status,
      reviewed_by: status === "pendente" ? null : socio.id,
      reviewer_comment: status === "rejeitado" ? comentario : null,
    })
    .eq("id", itemId);
  if (error) console.error("[documentos] falha ao revisar:", error.message);
  refresh();
}

function falha(error: { code?: string; message: string }): EstadoSimples {
  console.error("[documentos] falha:", error.code, error.message);
  return { erro: "Não foi possível salvar agora. Tente de novo." };
}
