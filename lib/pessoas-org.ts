import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Pessoas de uma organização: as que têm ela como principal (people.organization_id) e as ligadas por
// vínculo adicional (pessoa_organizacoes), sem duplicar o cadastro da pessoa.
export async function pessoasDaOrganizacao(supabase: Cliente, orgId: string) {
  const { data: vinculos } = await supabase.from("pessoa_organizacoes").select("person_id, papel").eq("organization_id", orgId);
  const extra = new Map((vinculos ?? []).map((v) => [v.person_id, v.papel]));
  const consulta = supabase.from("people").select("*").order("full_name");
  const { data, error } = await (extra.size
    ? consulta.or(`organization_id.eq.${orgId},id.in.(${[...extra.keys()].join(",")})`)
    : consulta.eq("organization_id", orgId));
  if (error) console.error("[pessoas-org] falha:", error.message);
  return {
    data: (data ?? []).map((p) => ({ ...p, adicional: p.organization_id !== orgId, papelVinculo: extra.get(p.id) ?? null })),
  };
}
