import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Organizações (com tipo, para filtrar fundos) e negócios abertos, usados nos formulários de reunião.
export async function opcoesReuniao(supabase: Cliente) {
  const [{ data: orgs }, { data: negocios }] = await Promise.all([
    supabase.from("organizations").select("id, trade_name, type").order("trade_name"),
    supabase.from("deals").select("id, title, organization_id").eq("status", "aberto").order("title"),
  ]);
  return {
    orgs: (orgs ?? []).map((o) => ({ id: o.id, nome: o.trade_name, tipo: o.type })),
    negocios: (negocios ?? []).map((n) => ({ id: n.id, nome: n.title, orgId: n.organization_id })),
  };
}
