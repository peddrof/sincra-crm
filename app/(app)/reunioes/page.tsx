import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoPrimario, Secao } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { formatarData, formatarDataHora } from "@/lib/crm";
import { driveLocalDisponivel, listarTranscricoesLocais } from "@/lib/drive-local";
import { listarTranscricoes, type ArquivoDrive } from "@/lib/google/drive";
import { statusGoogle } from "@/lib/google/oauth";
import { CopiarTexto } from "@/components/CopiarTexto";
import { hojeIso } from "@/lib/datas";
import { apelidoDe } from "@/lib/feed";
import { iaDisponivel, modoIa, promptParaColar } from "@/lib/ia/extracao";
import { rotuloContexto, STATUS_REUNIAO } from "@/lib/reunioes";
import { opcoesReuniao } from "@/lib/reunioes-dados";
import { createClient } from "@/lib/supabase/server";
import { ColarForm, ImportarDriveForm } from "./Formularios";

export const metadata: Metadata = { title: "Reuniões · Sincra" };

async function ReunioesConteudo() {
  const supabase = await createClient();
  const agora = new Date().toISOString();
  const [opcoes, { data: reunioes }, { data: agendadas }, google, ia] = await Promise.all([
    opcoesReuniao(supabase),
    supabase
      .from("interactions")
      .select("id, title, status, contexto, occurred_at, organization:organizations(trade_name)")
      .eq("type", "reuniao")
      .neq("status", "agendada")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("interactions")
      .select("id, title, contexto, occurred_at, organization:organizations(trade_name)")
      .eq("type", "reuniao")
      .eq("status", "agendada")
      .order("occurred_at"),
    statusGoogle(),
    iaDisponivel(),
  ]);

  const manual = modoIa() === "manual";
  const prompt = manual
    ? promptParaColar({
        socios: ((await supabase.from("profiles").select("full_name, nickname").eq("active", true)).data ?? []).map(apelidoDe),
        hoje: hojeIso(),
      })
    : "";
  const local = !google.conectado && (await driveLocalDisponivel());
  let arquivos: (Pick<ArquivoDrive, "id" | "name" | "modifiedTime"> & { legivel?: boolean })[] = [];
  let erroDrive: string | null = null;
  if (google.conectado || local) {
    try {
      arquivos = local ? await listarTranscricoesLocais() : await listarTranscricoes();
      const ids = arquivos.map((a) => a.id);
      if (ids.length) {
        const { data: ja } = await supabase.from("interactions").select("drive_file_id").in("drive_file_id", ids);
        const importados = new Set((ja ?? []).map((j) => j.drive_file_id));
        arquivos = arquivos.filter((a) => !importados.has(a.id));
      }
    } catch (e) {
      erroDrive = e instanceof Error ? e.message : "Falha ao ler o Drive.";
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-sincra-tinta">Contexto</p>
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Reuniões</h1>
          <p className="text-base leading-6 font-medium">
            <span className="text-cinza">
              {manual
                ? "Traga o resumo feito no Claude ou no ChatGPT (arquivo .md no Drive ou colado aqui)."
                : "A IA local lê a transcrição e sugere resumo, decisões e próximos passos."}
            </span>{" "}
            Nada entra no CRM sem a sua confirmação.
          </p>
        </div>
        <Link href="/reunioes/agendar" className={classeBotaoPrimario}>
          Agendar reunião
        </Link>
      </div>

      {manual ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-cartao border border-azul-100 bg-azul-25 p-4">
          <div className="flex max-w-xl flex-col gap-0.5">
            <span className="text-sm font-semibold text-sincra-tinta">Resumo pelo Claude ou ChatGPT</span>
            <span className="text-xs text-tinta-3">
              Cole este prompt junto com o áudio ou a transcrição. Com a resposta no formato dele, resumo, decisões, próximos
              passos e pessoas chegam preenchidos; com outro texto, ele vira o resumo e você completa na revisão.
            </span>
          </div>
          <CopiarTexto texto={prompt} rotulo="Copiar prompt" />
        </div>
      ) : (
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-cartao border p-4 ${
          ia.ok ? "border-azul-100 bg-azul-25" : "border-atencao/30 bg-atencao-bg"
        }`}
      >
        <div className="flex flex-col gap-0.5">
          <span className={`text-sm font-semibold ${ia.ok ? "text-sincra-tinta" : "text-atencao"}`}>
            {ia.ok ? "IA local ligada" : "IA local desligada"}
          </span>
          <span className="text-xs text-tinta-3">
            {ia.ok ? "Ollama aberto neste computador. Uma reunião curta leva cerca de 2 minutos." : ia.motivo}
          </span>
        </div>
        <StatusPill tipo={ia.ok ? "concluido" : "atencao"}>{ia.ok ? "Pronta" : "Indisponível"}</StatusPill>
      </div>
      )}

      {agendadas && agendadas.length > 0 && (
        <Secao titulo="Agendadas">
          <ul className="flex flex-col divide-y divide-linha">
            {agendadas.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/reunioes/${r.id}`} className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta">
                    {r.title ?? "Reunião"}
                  </Link>
                  <span className="text-xs text-cinza">{rotuloContexto(r.contexto, r.organization?.trade_name)}</span>
                </div>
                <span className={`tabular rounded-full px-3 py-1 text-xs font-semibold ${r.occurred_at < agora ? "bg-atencao-bg text-atencao" : "bg-sincra text-white"}`}>
                  {formatarDataHora(r.occurred_at)}
                  {r.occurred_at < agora && " · aguarda transcrição"}
                </span>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      <Secao titulo={manual ? "Resumos e transcrições novos no Drive" : "Transcrições novas no Drive"}>
        {local && <p className="text-xs text-cinza">Lendo a pasta sincronizada deste computador: {process.env.DRIVE_LOCAL_TRANSCRICOES}</p>}
        {!google.conectado && !local ? (
          <p className="text-sm leading-[22px] text-tinta-3">
            Configure a pasta do Drive em{" "}
            <Link href="/configuracoes" className="font-semibold text-sincra-tinta">
              Configurações
            </Link>{" "}
            para ler as transcrições. Enquanto isso, cole a transcrição abaixo.
          </p>
        ) : erroDrive ? (
          <p className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">{erroDrive}</p>
        ) : arquivos.length === 0 ? (
          <p className="text-sm leading-[22px] text-tinta-3">Nenhuma transcrição nova na pasta.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-linha">
            {arquivos.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm leading-[22px] font-semibold text-tinta">{a.name}</span>
                  <span className="tabular text-xs text-cinza">{formatarDataHora(a.modifiedTime)}</span>
                </div>
                {a.legivel === false ? (
                  <p className="text-xs leading-4 text-atencao">
                    Arquivo do Google Docs: a plataforma não lê pelo disco. No Docs, use Arquivo → Fazer download → Texto simples (.txt) e
                    salve nesta pasta, ou copie o texto e cole abaixo.
                  </p>
                ) : ia.ok ? (
                  <ImportarDriveForm arquivoId={a.id} orgs={opcoes.orgs} negocios={opcoes.negocios} />
                ) : (
                  <p className="text-xs text-cinza">Abra o Ollama para analisar.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <details className="rounded-cartao border border-linha bg-white p-6 shadow-cartao">
        <summary className="cursor-pointer text-lg leading-6 font-semibold tracking-[-0.015em]">
          {manual ? "Colar resumo ou transcrição" : "Colar transcrição"}
        </summary>
        <div className="pt-4">
          {ia.ok ? <ColarForm orgs={opcoes.orgs} negocios={opcoes.negocios} /> : <p className="text-sm text-cinza">{ia.motivo}</p>}
        </div>
      </details>

      <Secao titulo="Reuniões registradas">
        {reunioes && reunioes.length > 0 ? (
          <ul className="flex flex-col divide-y divide-linha">
            {reunioes.map((r) => {
              const st = STATUS_REUNIAO[r.status] ?? STATUS_REUNIAO.erro;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link href={`/reunioes/${r.id}`} className="text-sm leading-[22px] font-semibold text-tinta hover:text-sincra-tinta">
                      {r.title ?? "Reunião"}
                    </Link>
                    <span className="text-xs text-cinza">
                      {rotuloContexto(r.contexto, r.organization?.trade_name)} · <span className="tabular">{formatarData(r.occurred_at)}</span>
                    </span>
                  </div>
                  <StatusPill tipo={st.tipo}>{st.rotulo}</StatusPill>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm leading-[22px] text-tinta-3">Nenhuma reunião registrada ainda.</p>
        )}
      </Secao>
    </main>
  );
}

export default function ReunioesPage() {
  return (
    <Suspense fallback={<Carregando />}>
      <ReunioesConteudo />
    </Suspense>
  );
}
