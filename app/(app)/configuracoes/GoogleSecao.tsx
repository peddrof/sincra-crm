import { classeBotaoPrimario, classeBotaoSecundario } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { desconectarGoogle } from "@/lib/actions/google";
import { formatarDataHora } from "@/lib/crm";
import { statusGoogle } from "@/lib/google/oauth";

const MENSAGENS: Record<string, { tipo: "ok" | "erro"; texto: string }> = {
  conectado: { tipo: "ok", texto: "Google conectado. Drive e agenda já podem ser usados." },
  recusado: { tipo: "erro", texto: "A autorização foi cancelada no Google." },
  invalido: { tipo: "erro", texto: "O retorno do Google não confere. Tente conectar de novo." },
  erro: { tipo: "erro", texto: "Não foi possível concluir a conexão. Veja o log do servidor." },
  faltando: { tipo: "erro", texto: "Faltam variáveis de ambiente para conectar (.env.local no PC ou painel da Vercel)." },
};

export async function GoogleSecao({ situacao }: { situacao?: string }) {
  const status = await statusGoogle();
  const msg = situacao ? MENSAGENS[situacao] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {msg && (
        <p
          role={msg.tipo === "erro" ? "alert" : "status"}
          className={`rounded-campo px-3 py-2 text-sm ${msg.tipo === "erro" ? "bg-critico-bg text-critico" : "bg-ok-bg text-ok"}`}
        >
          {msg.texto}
        </p>
      )}

      {status.conectado ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm leading-[22px] font-semibold text-tinta">{status.email}</span>
            <span className="text-xs text-cinza">
              Conectado{status.conectadoPor ? ` por ${status.conectadoPor}` : ""} em{" "}
              <span className="tabular">{formatarDataHora(status.conectadoEm)}</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill tipo="concluido">Conectado</StatusPill>
            <form action={desconectarGoogle}>
              <button type="submit" className={classeBotaoSecundario}>
                Desconectar
              </button>
            </form>
          </div>
        </div>
      ) : status.faltando.length > 0 ? (
        <div className="flex flex-col gap-2">
          <StatusPill tipo="atencao">Faltam credenciais</StatusPill>
          <p className="text-sm leading-[22px] text-tinta-3">
            Preencha no <code className="rounded bg-superficie px-1">.env.local</code> (no PC) ou nas variáveis de ambiente
            da Vercel (publicada) e reinicie ou publique de novo:{" "}
            <span className="font-medium text-tinta">{status.faltando.join(", ")}</span>. Passo a passo em{" "}
            <code className="rounded bg-superficie px-1">docs/10-integracao-google.md</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm leading-[22px] text-tinta-3">
            Entre com a conta Google dona da pasta &quot;Org Sincra&quot;. A plataforma lê a pasta e a agenda e só grava nas
            pastas de clientes.
          </p>
          <a href="/integracoes/google/conectar" className={classeBotaoPrimario}>
            Conectar Google
          </a>
        </div>
      )}
    </div>
  );
}
