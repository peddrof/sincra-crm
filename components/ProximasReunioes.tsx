import Link from "next/link";
import { proximosEventos, type EventoAgenda } from "@/lib/google/calendar";
import { statusGoogle } from "@/lib/google/oauth";
import { listarFaltantes, resumoLista } from "@/lib/documentos";
import { createClient } from "@/lib/supabase/server";

const fuso = "America/Sao_Paulo";

function quando(e: EventoAgenda): string {
  if (e.diaInteiro) {
    const [a, m, d] = e.inicio.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(Date.UTC(a, m - 1, d)))
      .replace(/\./g, "");
  }
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: fuso })
    .format(new Date(e.inicio))
    .replace(/\./g, "");
}

function dominio(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

// Próximas reuniões da agenda (decisão #17) com o cliente identificado pelos convidados:
// e-mail de uma pessoa cadastrada ou domínio igual ao site da organização. Mostra o resumo antes da call.
export async function ProximasReunioes() {
  const google = await statusGoogle();
  if (!google.conectado) {
    return (
      <p className="text-sm leading-[22px] text-tinta-3">
        Conecte o Google em{" "}
        <Link href="/configuracoes" className="font-semibold text-sincra-tinta">
          Configurações
        </Link>{" "}
        para ver a agenda aqui.
      </p>
    );
  }

  let eventos: EventoAgenda[];
  try {
    eventos = await proximosEventos(7);
  } catch (e) {
    console.error("[agenda] falha:", e instanceof Error ? e.message : e);
    return <p className="text-sm text-critico">Não foi possível ler a agenda agora.</p>;
  }
  if (eventos.length === 0) return <p className="text-sm leading-[22px] text-tinta-3">Nenhuma reunião nos próximos 7 dias.</p>;

  const supabase = await createClient();
  const [{ data: pessoas }, { data: orgs }] = await Promise.all([
    supabase.from("people").select("email, organization_id").not("email", "is", null),
    supabase
      .from("organizations")
      .select(
        "id, trade_name, website, deals(title, status, stage:pipeline_stages(name)), document_requests(document_request_items(title, status, required))",
      ),
  ]);

  const orgPorEmail = new Map((pessoas ?? []).map((p) => [p.email!.toLowerCase(), p.organization_id]));
  const orgPorDominio = new Map((orgs ?? []).flatMap((o) => (dominio(o.website) ? [[dominio(o.website)!, o.id] as const] : [])));
  const orgPorId = new Map((orgs ?? []).map((o) => [o.id, o]));

  return (
    <ul className="flex flex-col divide-y divide-linha">
      {eventos.slice(0, 6).map((e) => {
        const orgId =
          e.convidados.map((c) => orgPorEmail.get(c)).find(Boolean) ??
          e.convidados.map((c) => orgPorDominio.get(c.split("@")[1] ?? "")).find(Boolean);
        const org = orgId ? orgPorId.get(orgId) : undefined;
        const negocio = org?.deals?.find((d) => d.status === "aberto");
        const itens = org?.document_requests?.flatMap((r) => r.document_request_items ?? []) ?? [];
        const docs = itens.length ? resumoLista(itens) : null;
        return (
          <li key={e.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm leading-[22px] font-semibold text-tinta">{e.titulo}</span>
              <span className="tabular text-xs text-cinza">{quando(e)}</span>
            </div>
            {org ? (
              <span className="text-sm leading-[22px] text-tinta-3">
                <Link href={`/organizacoes/${org.id}`} className="font-semibold text-sincra-tinta">
                  {org.trade_name}
                </Link>
                {negocio && ` · ${negocio.title} em ${negocio.stage?.name}`}
                {docs && (
                  <>
                    {" · "}
                    <span className="tabular">
                      {docs.recebidos} de {docs.total}
                    </span>{" "}
                    documentos{docs.faltam.length > 0 && `; faltam ${listarFaltantes(docs.faltam, 2)}`}
                  </>
                )}
              </span>
            ) : (
              <span className="text-xs text-cinza">Nenhum convidado cadastrado no CRM.</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
