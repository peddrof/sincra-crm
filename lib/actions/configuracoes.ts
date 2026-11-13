"use server";

import { refresh } from "next/cache";
import { getSocio } from "@/lib/auth";
import { lerTaxa } from "@/lib/negocios";
import { createClient } from "@/lib/supabase/server";

export type EstadoConfig = { erro?: string; ok?: boolean };

const CHAVES = ["default_rate_hospital", "default_rate_medico"] as const;

// Taxas padrão em % ao mês (decisão #8). A alteração vira evento no feed pelo gatilho de settings.
export async function salvarTaxas(_anterior: EstadoConfig, formData: FormData): Promise<EstadoConfig> {
  const socio = await getSocio();
  const supabase = await createClient();

  for (const chave of CHAVES) {
    const taxa = lerTaxa(String(formData.get(chave) ?? ""));
    if (taxa === null || Number.isNaN(taxa) || taxa <= 0 || taxa >= 100) {
      return { erro: "Informe as duas taxas, em % ao mês. Ex.: 3,5" };
    }
    const { error } = await supabase
      .from("settings")
      .update({ value: { value: taxa, unit: "percent_per_month" }, updated_by: socio.id, updated_at: new Date().toISOString() })
      .eq("key", chave);
    if (error) {
      console.error("[config] falha ao salvar:", error.message);
      return { erro: "Não foi possível salvar agora." };
    }
  }
  refresh();
  return { ok: true };
}

const PRAZOS = ["followup_negocio_parado_dias", "followup_documento_pendente_dias", "followup_sem_contato_dias"] as const;

// Prazos dos alertas de follow-up (decisão #18), em dias inteiros.
export async function salvarPrazos(_anterior: EstadoConfig, formData: FormData): Promise<EstadoConfig> {
  const socio = await getSocio();
  const supabase = await createClient();
  for (const chave of PRAZOS) {
    const dias = Number(String(formData.get(chave) ?? "").trim());
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { erro: "Use dias inteiros entre 1 e 365." };
    const { error } = await supabase
      .from("settings")
      .update({ value: { value: dias }, updated_by: socio.id, updated_at: new Date().toISOString() })
      .eq("key", chave);
    if (error) {
      console.error("[config] falha ao salvar prazos:", error.message);
      return { erro: "Não foi possível salvar agora." };
    }
  }
  refresh();
  return { ok: true };
}
