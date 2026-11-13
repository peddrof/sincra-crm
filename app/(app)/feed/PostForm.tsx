"use client";

import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";

import { useActionState } from "react";
import { classeAreaTexto, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { postar, type EstadoPost } from "@/lib/actions/feed";
import { AREAS } from "@/lib/feed";

export function PostForm({
  areaPadrao,
  organizacoes,
  apelidos,
}: {
  areaPadrao: string;
  organizacoes: { id: string; nome: string }[];
  apelidos: string[];
}) {
  const [estado, acao, pendente] = useActionState<EstadoPost, FormData>(postar, {});
  const v = estado.valores;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <AvisoAlteracoes />
      <label htmlFor="body" className="sr-only">
        Atualização
      </label>
      <textarea
        id="body"
        name="body"
        required
        maxLength={4000}
        defaultValue={v?.body}
        placeholder="O que mudou? Mencione alguém com @."
        className={`${classeAreaTexto} min-h-28`}
      />
      {apelidos.length > 0 && (
        <p className="text-xs leading-4 text-cinza">Menções: {apelidos.map((a) => `@${a}`).join(", ")}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Área
          <select name="area" defaultValue={v?.area ?? areaPadrao} className={classeCampo}>
            {AREAS.map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Organização
          <select name="organization_id" defaultValue={v?.organization_id ?? ""} className={classeCampo}>
            <option value="">Nenhuma</option>
            {organizacoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Anexo (até 8 MB)
          <input
            type="file"
            name="anexo"
            className="block w-full text-sm text-tinta-3 file:mr-3 file:h-11 file:rounded-full file:border file:border-linha file:bg-white file:px-4 file:text-sm file:font-semibold file:text-tinta hover:file:bg-superficie"
          />
        </label>
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          {estado.erro}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Postando…" : "Postar atualização"}
        </button>
      </div>
    </form>
  );
}
