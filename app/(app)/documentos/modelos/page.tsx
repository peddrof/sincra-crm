import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoSecundario, classeCampo, Secao } from "@/components/campos";
import { CopiarTexto } from "@/components/CopiarTexto";
import { arquivarModelo, salvarLinkModelo } from "@/lib/actions/documentos";
import { rotuloTipo } from "@/lib/crm";
import { createClient } from "@/lib/supabase/server";
import { ModeloForm } from "./ModeloForm";

export const metadata: Metadata = { title: "Modelos de lista · Sincra" };

async function ModelosConteudo() {
  const supabase = await createClient();
  const { data: modelos } = await supabase
    .from("document_checklists")
    .select("id, name, organization_type, link_formulario, document_checklist_items(title, required, position)")
    .eq("active", true)
    .order("name");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/documentos" className="text-xs font-semibold text-sincra-tinta">
          Documentos
        </Link>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Modelos de lista</h1>
        <p className="text-base leading-6 font-medium">
          <span className="text-cinza">O que pedir a cada tipo de cliente.</span> Cada lista nova copia um modelo.
        </p>
      </div>

      {modelos && modelos.length > 0 && (
        <div className="flex flex-col gap-4">
          {modelos.map((m) => {
            const itens = [...(m.document_checklist_items ?? [])].sort((a, b) => a.position - b.position);
            return (
              <Secao
                key={m.id}
                titulo={m.name}
                acao={
                  <form action={arquivarModelo}>
                    <input type="hidden" name="checklist_id" value={m.id} />
                    <button type="submit" className="text-sm font-semibold text-tinta-3 hover:text-tinta">
                      Arquivar
                    </button>
                  </form>
                }
              >
                <p className="text-xs text-cinza">
                  {m.organization_type ? rotuloTipo(m.organization_type) : "Qualquer tipo"} · {itens.length}{" "}
                  {itens.length === 1 ? "documento" : "documentos"}
                </p>
                <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm leading-[22px] text-tinta-3">
                  {itens.map((i) => (
                    <li key={i.position}>
                      {i.title}
                      {!i.required && <span className="text-cinza"> (opcional)</span>}
                    </li>
                  ))}
                </ol>
                <form action={salvarLinkModelo} className="flex flex-wrap items-end gap-2 border-t border-linha pt-4">
                  <input type="hidden" name="checklist_id" value={m.id} />
                  <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs font-semibold text-tinta-2">
                    Link do formulário
                    <input
                      name="link_formulario"
                      type="url"
                      defaultValue={m.link_formulario ?? ""}
                      placeholder="https://forms.gle/..."
                      className={classeCampo}
                    />
                  </label>
                  <button type="submit" className={classeBotaoSecundario}>
                    Salvar link
                  </button>
                  {m.link_formulario && <CopiarTexto texto={m.link_formulario} />}
                </form>
              </Secao>
            );
          })}
        </div>
      )}

      <Secao titulo="Novo modelo">
        <ModeloForm />
      </Secao>
    </main>
  );
}

export default function ModelosPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <ModelosConteudo />
    </Suspense>
  );
}
