"use client";

import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";

import { useActionState } from "react";
import { Campo, classeAreaTexto, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { criarModelo, type EstadoSimples } from "@/lib/actions/documentos";
import { TIPOS_ORGANIZACAO } from "@/lib/crm";

export function ModeloForm() {
  const [estado, acao, pendente] = useActionState<EstadoSimples, FormData>(criarModelo, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <AvisoAlteracoes />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Campo id="name" rotulo="Nome do modelo" obrigatorio>
          <input id="name" name="name" required placeholder="Documentos de hospital" className={classeCampo} />
        </Campo>
        <Campo id="organization_type" rotulo="Para o tipo">
          <select id="organization_type" name="organization_type" defaultValue="" className={classeCampo}>
            <option value="">Qualquer</option>
            {TIPOS_ORGANIZACAO.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Campo
        id="items"
        rotulo="Documentos"
        obrigatorio
        ajuda='Um por linha. Comece a linha com "opcional:" para marcar como opcional.'
      >
        <textarea
          id="items"
          name="items"
          required
          placeholder={"Contrato social\nÚltimo balanço\nopcional: Certidão negativa de débitos"}
          className={`${classeAreaTexto} min-h-40`}
        />
      </Campo>
      <Campo
        id="link_formulario"
        rotulo="Link do formulário"
        ajuda="Opcional. Ex.: o Google Forms que o hospital usa para enviar os documentos. Aparece em cada lista aberta com este modelo."
      >
        <input id="link_formulario" name="link_formulario" type="url" placeholder="https://forms.gle/..." className={classeCampo} />
      </Campo>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Salvar modelo"}
        </button>
      </div>
    </form>
  );
}
