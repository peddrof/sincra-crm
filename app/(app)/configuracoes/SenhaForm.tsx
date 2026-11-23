"use client";

import { useActionState } from "react";
import { Campo, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { trocarSenha, type EstadoConfig } from "@/lib/actions/configuracoes";

export function SenhaForm() {
  const [estado, acao, pendente] = useActionState<EstadoConfig, FormData>(trocarSenha, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="senha" rotulo="Nova senha">
          <input id="senha" name="senha" type="password" autoComplete="new-password" minLength={10} required className={classeCampo} />
        </Campo>
        <Campo id="confirmacao" rotulo="Repita a nova senha">
          <input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={10} required className={classeCampo} />
        </Campo>
      </div>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p role="status" className="rounded-campo bg-ok-bg px-3 py-2 text-sm text-ok">
          Senha trocada. Use a nova no próximo login.
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Salvando…" : "Trocar senha"}
        </button>
      </div>
    </form>
  );
}
