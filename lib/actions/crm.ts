"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSocio } from "@/lib/auth";
import { TIPOS_ORGANIZACAO, type TipoOrganizacao } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { cnpjValido, emailValido, normalizarCnpj, textoOuNulo, UFS } from "@/lib/validacao";

export type EstadoFormulario = {
  erros?: Record<string, string>;
  mensagem?: string;
  valores?: Record<string, string>;
  duplicado?: { id: string; nome: string };
};

function valoresDe(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (!k.startsWith("$")) valores[k] = String(v);
  });
  return valores;
}

// O evento no feed é gravado pelo gatilho do banco (private.registrar_evento_crm), não aqui.

export async function salvarOrganizacao(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await getSocio();
  const valores = valoresDe(formData);
  const erros: Record<string, string> = {};

  const id = textoOuNulo(formData.get("id"));
  const tipo = String(formData.get("type") ?? "") as TipoOrganizacao;
  const nome = textoOuNulo(formData.get("trade_name"));
  const cnpjDigitado = textoOuNulo(formData.get("cnpj"));
  const uf = textoOuNulo(formData.get("state"))?.toUpperCase() ?? null;

  if (!TIPOS_ORGANIZACAO.some((t) => t.valor === tipo)) erros.type = "Escolha o tipo.";
  if (!nome) erros.trade_name = "Informe o nome.";
  let cnpj: string | null = null;
  if (cnpjDigitado) {
    if (cnpjValido(cnpjDigitado)) cnpj = normalizarCnpj(cnpjDigitado);
    else erros.cnpj = "CNPJ inválido. Confira os dígitos.";
  }
  if (uf && !(UFS as readonly string[]).includes(uf)) erros.state = "UF inválida.";
  if (Object.keys(erros).length) return { erros, valores };

  const supabase = await createClient();

  if (cnpj) {
    let busca = supabase.from("organizations").select("id, trade_name").eq("cnpj", cnpj);
    if (id) busca = busca.neq("id", id);
    const { data: existente } = await busca.maybeSingle();
    if (existente) {
      return {
        erros: { cnpj: `Já existe uma organização com este CNPJ: ${existente.trade_name}.` },
        valores,
        duplicado: { id: existente.id, nome: existente.trade_name },
      };
    }
  }

  const dados = {
    type: tipo,
    trade_name: nome!,
    legal_name: textoOuNulo(formData.get("legal_name")),
    cnpj,
    city: textoOuNulo(formData.get("city")),
    state: uf,
    website: textoOuNulo(formData.get("website")),
    notes: textoOuNulo(formData.get("notes")),
    owner_id: textoOuNulo(formData.get("owner_id")),
  };

  let salvoId = id;
  if (id) {
    const { error } = await supabase.from("organizations").update(dados).eq("id", id);
    if (error) return falha(error, valores);
  } else {
    const { data, error } = await supabase.from("organizations").insert(dados).select("id").single();
    if (error) return falha(error, valores);
    salvoId = data.id;
  }

  redirect(`/organizacoes/${salvoId}`);
}

// Pessoa com ou sem organização (contatos avulsos não precisam de instituição nem de CRM).
export async function salvarPessoa(_anterior: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await getSocio();
  const valores = valoresDe(formData);
  const erros: Record<string, string> = {};

  const id = textoOuNulo(formData.get("id"));
  const organizacaoId = textoOuNulo(formData.get("organization_id"));
  const nome = textoOuNulo(formData.get("full_name"));
  const email = textoOuNulo(formData.get("email"))?.toLowerCase() ?? null;
  const podeAssinar = formData.get("can_sign") === "on";
  const evidenciaId = podeAssinar && organizacaoId ? textoOuNulo(formData.get("signing_evidence_document_id")) : null;

  if (!nome) erros.full_name = "Informe o nome.";
  if (email && !emailValido(email)) erros.email = "E-mail inválido.";
  const relacao = lerRelacionamento(formData, erros);
  if (Object.keys(erros).length) return { erros, valores };

  const supabase = await createClient();

  // O documento de comprovação precisa ser da mesma organização.
  if (evidenciaId) {
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", evidenciaId)
      .eq("organization_id", organizacaoId!)
      .maybeSingle();
    if (!doc) return { erros: { signing_evidence_document_id: "Documento não encontrado nesta organização." }, valores };
  }

  const dados = {
    organization_id: organizacaoId,
    full_name: nome!,
    role_title: textoOuNulo(formData.get("role_title")),
    email,
    phone: textoOuNulo(formData.get("phone")),
    crm_number: textoOuNulo(formData.get("crm_number"))?.toUpperCase() ?? null,
    can_sign: podeAssinar && Boolean(organizacaoId),
    signing_evidence_document_id: evidenciaId,
    notes: textoOuNulo(formData.get("notes")),
    ...relacao,
  };

  let salvoId = id;
  if (id) {
    const { error } = await supabase.from("people").update(dados).eq("id", id);
    if (error) return falha(error, valores);
  } else {
    const { data, error } = await supabase.from("people").insert(dados).select("id").single();
    if (error) return falha(error, valores);
    salvoId = data.id;
  }

  const retorno = textoOuNulo(formData.get("retorno"));
  if (retorno && retorno.startsWith("/") && !retorno.startsWith("//")) redirect(retorno);
  redirect(organizacaoId && !formData.has("contatos") ? `/organizacoes/${organizacaoId}` : `/contatos/${salvoId}`);
}

const PROFUNDIDADES_OK = new Set(["0", "1", "2", "3"]);
const PRIORIDADES_OK = new Set(["1", "2", "3"]);
const SITUACOES_OK = new Set(["ativa", "retomavel", "em_aberto", "sem_resposta", "recusa", "recusa_grosseira", "evidencia_insuficiente"]);
const TIPOS_OK = new Set(["comercial", "parceiro", "prestador", "mentor", "ponte", "interno", "outro"]);

// Campos de relacionamento (profundidade, situação, prioridade, local verificado…).
function lerRelacionamento(formData: FormData, erros: Record<string, string>) {
  const escolha = (campo: string, validos: Set<string>) => {
    const v = textoOuNulo(formData.get(campo));
    if (v && !validos.has(v)) erros[campo] = "Opção inválida.";
    return v && validos.has(v) ? v : null;
  };
  const profundidade = escolha("profundidade", PROFUNDIDADES_OK);
  const prioridade = escolha("prioridade", PRIORIDADES_OK);
  const ultima = textoOuNulo(formData.get("ultima_interacao"));
  if (ultima && !/^\d{4}-\d{2}-\d{2}$/.test(ultima)) erros.ultima_interacao = "Data inválida.";
  const uf = textoOuNulo(formData.get("uf"))?.toUpperCase() ?? null;
  if (uf && !(UFS as readonly string[]).includes(uf)) erros.uf = "UF inválida.";
  const cidade = textoOuNulo(formData.get("cidade"));
  const natureza = textoOuNulo(formData.get("natureza_local"));
  return {
    relacao_tipo: escolha("relacao_tipo", TIPOS_OK),
    profundidade: profundidade === null ? null : Number(profundidade),
    situacao: escolha("situacao", SITUACOES_OK),
    prioridade: prioridade === null ? null : Number(prioridade),
    ultima_interacao: ultima,
    confirmacao_pendente: formData.get("confirmacao_pendente") === "on",
    motivo_classificacao: textoOuNulo(formData.get("motivo_classificacao")),
    proximo_passo: textoOuNulo(formData.get("proximo_passo")),
    canal_contato: textoOuNulo(formData.get("canal_contato")),
    fontes: textoOuNulo(formData.get("fontes")),
    cidade,
    uf,
    natureza_local: cidade || uf ? (natureza === "pessoal" ? "pessoal" : natureza === "profissional" ? "profissional" : null) : null,
  };
}

function falha(error: { code?: string; message: string }, valores: Record<string, string>): EstadoFormulario {
  if (error.code === "23505") {
    return { erros: { cnpj: "Já existe uma organização com este CNPJ." }, valores };
  }
  console.error("[crm] falha ao salvar:", error.code, error.message);
  return { mensagem: "Não foi possível salvar agora. Tente de novo.", valores };
}

// Vínculo adicional da pessoa com outra organização (a principal continua em people.organization_id).
export async function vincularOrganizacao(formData: FormData) {
  await getSocio();
  const pessoaId = textoOuNulo(formData.get("person_id"));
  const orgId = textoOuNulo(formData.get("organization_id"));
  if (!pessoaId || !orgId) return;
  const supabase = await createClient();
  const { data: pessoa } = await supabase.from("people").select("organization_id").eq("id", pessoaId).maybeSingle();
  if (!pessoa || pessoa.organization_id === orgId) return; // já é a organização principal
  const { error } = await supabase
    .from("pessoa_organizacoes")
    .upsert({ person_id: pessoaId, organization_id: orgId, papel: textoOuNulo(formData.get("papel")) });
  if (error) console.error("[crm] falha ao ligar organização:", error.message);
  refresh();
}

export async function desvincularOrganizacao(formData: FormData) {
  await getSocio();
  const pessoaId = textoOuNulo(formData.get("person_id"));
  const orgId = textoOuNulo(formData.get("organization_id"));
  if (!pessoaId || !orgId) return;
  const supabase = await createClient();
  const { error } = await supabase.from("pessoa_organizacoes").delete().eq("person_id", pessoaId).eq("organization_id", orgId);
  if (error) console.error("[crm] falha ao tirar organização:", error.message);
  refresh();
}
