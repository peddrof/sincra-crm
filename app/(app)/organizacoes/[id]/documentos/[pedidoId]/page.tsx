import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { CopiarTexto } from "@/components/CopiarTexto";
import { EnviarArquivo } from "@/components/documentos/EnviarArquivo";
import { StatusPill } from "@/components/StatusPill";
import { revisarItem } from "@/lib/actions/documentos";
import { formatarData, nomeCurto } from "@/lib/crm";
import { listarFaltantes, resumoLista, STATUS_ITEM } from "@/lib/documentos";
import { formatarTamanho } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lista de documentos · Sincra" };

type Params = { id: string; pedidoId: string };

async function ListaConteudo({ params }: { params: Promise<Params> }) {
  const { id, pedidoId } = await params;
  const supabase = await createClient();

  const { data: lista } = await supabase
    .from("document_requests")
    .select(
      "id, name, link_formulario, created_at, organization_id, organization:organizations(trade_name), deal:deals(id, title), document_request_items(id, title, description, required, position, status, reviewer_comment, reviewer:profiles!document_request_items_reviewed_by_fkey(full_name, nickname), document:documents(id, size_bytes, created_at))",
    )
    .eq("id", pedidoId)
    .eq("organization_id", id)
    .maybeSingle();
  if (!lista || !lista.organization) notFound();

  const itens = [...(lista.document_request_items ?? [])].sort((a, b) => a.position - b.position);
  const resumo = resumoLista(itens);
  const pasta = `${lista.organization_id}/${lista.id}/`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href={`/organizacoes/${id}`} className="text-xs font-semibold text-sincra-tinta">
          {lista.organization.trade_name}
        </Link>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{lista.name ?? "Lista de documentos"}</h1>
        <p className="text-base leading-6 font-medium">
          <span className="tabular text-cinza">
            {lista.organization.trade_name} enviou {resumo.recebidos} de {resumo.total} documentos.
          </span>{" "}
          {resumo.faltam.length > 0 ? `Faltam ${listarFaltantes(resumo.faltam, 4)}.` : "Nenhum obrigatório faltando."}
        </p>
        <p className="text-xs text-cinza">
          Aberta em <span className="tabular">{formatarData(lista.created_at)}</span>
          {lista.deal && (
            <>
              {" · Negócio "}
              <Link href={`/negocios/${lista.deal.id}`} className="font-semibold text-sincra-tinta">
                {lista.deal.title}
              </Link>
            </>
          )}
        </p>
      </div>

      {lista.link_formulario && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-cartao border border-azul-100 bg-azul-25 p-4">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-semibold text-sincra-tinta">Formulário para o cliente enviar os documentos</span>
            <a href={lista.link_formulario} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-sincra-tinta underline">
              {lista.link_formulario}
            </a>
          </div>
          <CopiarTexto texto={lista.link_formulario} />
        </div>
      )}

      <p className="rounded-campo bg-superficie px-4 py-3 text-xs leading-4 text-tinta-3">
        Envie um arquivo por item, até 25 MB. Com o Google conectado, cada arquivo vai para a pasta do cliente no Drive logo
        depois do envio; sem ele, fica no armazenamento privado da plataforma.
      </p>

      <ol className="flex flex-col gap-3">
        {itens.map((item) => {
          const st = STATUS_ITEM[item.status];
          return (
            <li key={item.id} className="flex flex-col gap-3 rounded-cartao border border-linha bg-white p-5 shadow-cartao">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm leading-[22px] font-semibold text-tinta">
                    <span className="tabular text-cinza">{item.position}.</span> {item.title}
                    {!item.required && <span className="font-normal text-cinza"> (opcional)</span>}
                  </span>
                  {item.description && <span className="text-sm leading-[22px] text-tinta-3">{item.description}</span>}
                  {item.document && (
                    <a href={`/documentos/arquivo/${item.document.id}`} className="w-fit text-sm font-semibold text-sincra-tinta">
                      Baixar arquivo
                      {item.document.size_bytes ? (
                        <span className="tabular font-normal text-cinza"> · {formatarTamanho(item.document.size_bytes)}</span>
                      ) : null}
                    </a>
                  )}
                  {item.status === "rejeitado" && item.reviewer_comment && (
                    <span className="text-sm leading-[22px] text-critico">
                      Recusado por {nomeCurto(item.reviewer)}: {item.reviewer_comment}
                    </span>
                  )}
                  {item.status === "aprovado" && <span className="text-xs text-cinza">Aprovado por {nomeCurto(item.reviewer)}</span>}
                </div>
                <StatusPill tipo={st.tipo}>{st.rotulo}</StatusPill>
              </div>

              <div className="flex flex-wrap items-start gap-2 border-t border-linha pt-3">
                {(item.status === "pendente" || item.status === "rejeitado") && (
                  <EnviarArquivo itemId={item.id} pasta={pasta} rotulo={item.status === "rejeitado" ? "Enviar nova versão" : "Enviar arquivo"} />
                )}
                {item.status === "recebido" && (
                  <>
                    <form action={revisarItem}>
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="decisao" value="aprovar" />
                      <button type="submit" className="h-9 rounded-full bg-tinta px-4 text-sm font-semibold text-white hover:bg-tinta-2">
                        Aprovar
                      </button>
                    </form>
                    <form action={revisarItem} className="flex min-w-0 flex-1 gap-2">
                      <input type="hidden" name="item_id" value={item.id} />
                      <input type="hidden" name="decisao" value="recusar" />
                      <label htmlFor={`motivo-${item.id}`} className="sr-only">
                        Motivo da recusa
                      </label>
                      <input
                        id={`motivo-${item.id}`}
                        name="comentario"
                        required
                        placeholder="Motivo da recusa"
                        className="h-9 min-w-0 flex-1 rounded-campo border border-linha px-3 text-sm outline-none placeholder:text-cinza focus:border-sincra focus:ring-3 focus:ring-azul-100"
                      />
                      <button
                        type="submit"
                        className="h-9 shrink-0 rounded-full border border-linha bg-white px-4 text-sm font-semibold text-critico hover:bg-critico-bg"
                      >
                        Recusar
                      </button>
                    </form>
                  </>
                )}
                {item.status === "aprovado" && (
                  <form action={revisarItem}>
                    <input type="hidden" name="item_id" value={item.id} />
                    <input type="hidden" name="decisao" value="reabrir" />
                    <button type="submit" className="text-sm font-semibold text-tinta-3 hover:text-tinta">
                      Reabrir item
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

export default function ListaDocumentosPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <ListaConteudo params={params} />
    </Suspense>
  );
}
