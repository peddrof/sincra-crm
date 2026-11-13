import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { classeBotaoPrimario, classeBotaoSecundario, Secao } from "@/components/campos";
import { StatusPill } from "@/components/StatusPill";
import { descartar, reprocessar } from "@/lib/actions/reunioes";
import { getSocio } from "@/lib/auth";
import { formatarData, formatarDataHora, nomeCurto } from "@/lib/crm";
import { caminhoLegivel, driveLocalDisponivel, listarTranscricoesLocais, PREFIXO } from "@/lib/drive-local";
import { apelidoDe } from "@/lib/feed";
import { iaDisponivel, type ExtracaoReuniao } from "@/lib/ia/extracao";
import { linkGoogleAgenda, rotuloContexto, STATUS_REUNIAO } from "@/lib/reunioes";
import { opcoesReuniao } from "@/lib/reunioes-dados";
import { createClient } from "@/lib/supabase/server";
import { AtualizarSozinho, ColarForm, ImportarDriveForm } from "../Formularios";
import { RevisaoForm } from "./RevisaoForm";

export const metadata: Metadata = { title: "Reunião · Sincra" };

function BotaoDescartar({ id, rotulo }: { id: string; rotulo: string }) {
  return (
    <form action={descartar}>
      <input type="hidden" name="interaction_id" value={id} />
      <button type="submit" className="text-sm font-semibold text-tinta-3 hover:text-critico">
        {rotulo}
      </button>
    </form>
  );
}

async function ReuniaoConteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const socio = await getSocio();
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("interactions")
    .select(
      "*, organization:organizations(id, trade_name), deal:deals(id, title), confirmador:profiles!interactions_confirmed_by_fkey(full_name, nickname)",
    )
    .eq("id", id)
    .eq("type", "reuniao")
    .maybeSingle();
  if (!r) notFound();

  const st = STATUS_REUNIAO[r.status] ?? STATUS_REUNIAO.erro;
  const extracao = r.extraction as (ExtracaoReuniao & { cortada?: boolean }) | null;
  const precisaTranscricao = r.status === "agendada" || (r.status === "erro" && !r.drive_file_id);
  const ia = precisaTranscricao || r.status === "erro" ? await iaDisponivel() : { ok: true };

  let revisao: React.ReactNode = null;
  if (r.status === "revisar" && extracao) {
    const [{ data: socios }, { data: pessoas }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, nickname").eq("active", true).order("full_name"),
      r.organization_id
        ? supabase.from("people").select("full_name").eq("organization_id", r.organization_id)
        : Promise.resolve({ data: [] as { full_name: string }[] }),
    ]);
    revisao = (
      <RevisaoForm
        id={r.id}
        extracao={r.organization_id ? extracao : { ...extracao, pessoas: [] }}
        socios={(socios ?? []).map((s) => ({ id: s.id, apelido: apelidoDe(s) }))}
        pessoasExistentes={(pessoas ?? []).map((p) => p.full_name.trim().toLowerCase())}
        socioAtual={socio.id}
      />
    );
  }

  // Reunião agendada (ou com erro de texto colado): oferecer transcrições novas da pasta e colar o texto.
  let anexar: React.ReactNode = null;
  if (precisaTranscricao && ia.ok) {
    const opcoes = await opcoesReuniao(supabase);
    let arquivos: { id: string; name: string; modifiedTime: string; legivel: boolean }[] = [];
    if (await driveLocalDisponivel()) {
      const todos = await listarTranscricoesLocais().catch(() => []);
      const ids = todos.map((a) => a.id);
      const { data: ja } = ids.length
        ? await supabase.from("interactions").select("drive_file_id").in("drive_file_id", ids)
        : { data: [] as { drive_file_id: string | null }[] };
      const usados = new Set((ja ?? []).map((j) => j.drive_file_id));
      arquivos = todos.filter((a) => a.legivel && !usados.has(a.id)).slice(0, 8);
    }
    anexar = (
      <Secao titulo="Registrar a transcrição">
        {arquivos.length > 0 && (
          <ul className="flex flex-col divide-y divide-linha">
            {arquivos.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 first:pt-0">
                <span className="text-sm font-semibold text-tinta">
                  {a.name} <span className="tabular font-normal text-cinza">· {formatarDataHora(a.modifiedTime)}</span>
                </span>
                <ImportarDriveForm arquivoId={a.id} orgs={opcoes.orgs} negocios={opcoes.negocios} interacaoId={r.id} />
              </li>
            ))}
          </ul>
        )}
        <details open={arquivos.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-sincra-tinta">Colar o texto da transcrição</summary>
          <div className="pt-3">
            <ColarForm orgs={opcoes.orgs} negocios={opcoes.negocios} interacaoId={r.id} />
          </div>
        </details>
      </Secao>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link href="/reunioes" className="text-xs font-semibold text-sincra-tinta">
          Reuniões
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">{r.title ?? "Reunião"}</h1>
          <StatusPill tipo={st.tipo}>{st.rotulo}</StatusPill>
        </div>
        <p className="text-sm text-cinza">
          {r.organization ? (
            <Link href={`/organizacoes/${r.organization.id}`} className="font-semibold text-sincra-tinta">
              {rotuloContexto(r.contexto, r.organization.trade_name)}
            </Link>
          ) : (
            <span className="font-semibold text-sincra-tinta">{rotuloContexto(r.contexto)}</span>
          )}
          {r.deal && (
            <>
              {" · "}
              <Link href={`/negocios/${r.deal.id}`} className="font-semibold text-sincra-tinta">
                {r.deal.title}
              </Link>
            </>
          )}
          {" · "}
          <span className="tabular">{r.status === "agendada" ? formatarDataHora(r.occurred_at) : formatarData(r.occurred_at)}</span>
          {r.drive_file_id &&
            (r.drive_file_id.startsWith(PREFIXO) ? (
              <> · Transcrição: {caminhoLegivel(r.drive_file_id)}</>
            ) : (
              <>
                {" · "}
                <a href={`https://drive.google.com/file/d/${r.drive_file_id}/view`} className="font-semibold text-sincra-tinta">
                  Transcrição no Drive
                </a>
              </>
            ))}
        </p>
      </div>

      {r.status === "agendada" && (
        <section className="flex flex-col gap-4 rounded-cartao border border-azul-100 bg-azul-25 p-6">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="text-xs text-cinza">Quando</div>
              <div className="tabular font-semibold text-sincra-tinta">{formatarDataHora(r.occurred_at)}</div>
            </div>
            <div>
              <div className="text-xs text-cinza">Duração</div>
              <div className="tabular font-semibold text-sincra-tinta">{r.duracao_minutos ?? 60} min</div>
            </div>
            <div>
              <div className="text-xs text-cinza">Local</div>
              <div className="font-semibold break-words text-sincra-tinta">{r.local ?? "A definir"}</div>
            </div>
          </div>
          {r.participantes.length > 0 && <p className="text-sm text-tinta-3">Convidados: {r.participantes.join(", ")}</p>}
          {r.summary && <p className="text-sm whitespace-pre-line text-tinta-3">Pauta: {r.summary}</p>}
          <div className="flex flex-wrap gap-3">
            <a
              href={linkGoogleAgenda({
                titulo: r.title ?? "Reunião Sincra",
                inicio: r.occurred_at,
                duracaoMin: r.duracao_minutos ?? 60,
                detalhes: r.summary,
                local: r.local,
                convidados: r.participantes,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className={classeBotaoPrimario}
            >
              Adicionar ao Google Agenda
            </a>
            <a href={`/reunioes/${r.id}/convite`} className={classeBotaoSecundario}>
              Baixar convite (.ics)
            </a>
          </div>
          <p className="text-xs text-cinza">
            O Google Agenda abre com a reunião preenchida e os convidados; ao salvar lá, eles recebem o convite.
          </p>
          <BotaoDescartar id={r.id} rotulo="Cancelar reunião" />
        </section>
      )}

      {precisaTranscricao && !ia.ok && "motivo" in ia && (
        <p className="rounded-campo bg-atencao-bg px-3 py-2 text-sm text-atencao">
          Para registrar a transcrição com a IA: {ia.motivo}
        </p>
      )}
      {anexar}

      {r.status === "processando" && (
        <Secao titulo="Analisando a transcrição">
          <AtualizarSozinho segundos={10} />
          <p className="text-sm leading-[22px] text-tinta-3">
            O modelo local está lendo a transcrição. Neste computador isso leva alguns minutos. A página se atualiza sozinha.
          </p>
          <BotaoDescartar id={r.id} rotulo="Cancelar e descartar" />
        </Secao>
      )}

      {r.status === "erro" && (
        <Secao titulo="Não foi possível analisar">
          <p className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">{r.error ?? "Erro desconhecido."}</p>
          <div className="flex flex-wrap items-center gap-3">
            {r.drive_file_id && (
              <form action={reprocessar}>
                <input type="hidden" name="interaction_id" value={r.id} />
                <button type="submit" className={classeBotaoPrimario}>
                  Tentar de novo
                </button>
              </form>
            )}
            <BotaoDescartar id={r.id} rotulo="Descartar" />
          </div>
        </Secao>
      )}

      {r.status === "revisar" && (
        <Secao titulo="Revise antes de gravar">
          {extracao?.cortada && (
            <p className="rounded-campo bg-atencao-bg px-3 py-2 text-sm text-atencao">
              A transcrição é longa e só o começo foi lido pelo modelo local. Confira se faltou algo do final.
            </p>
          )}
          {!r.organization_id && (
            <p className="text-xs text-cinza">Reunião sem organização: tarefas e decisões ficam gerais; pessoas citadas não são cadastradas.</p>
          )}
          {revisao}
          <div className="border-t border-linha pt-4">
            <BotaoDescartar id={r.id} rotulo="Descartar esta análise" />
          </div>
        </Secao>
      )}

      {r.status === "confirmada" && (
        <Secao titulo="Resumo">
          <p className="text-sm leading-[22px] whitespace-pre-line text-tinta-3">{r.summary}</p>
          {r.confirmed_at && (
            <p className="text-xs text-cinza">
              Confirmada por {nomeCurto(r.confirmador)} em <span className="tabular">{formatarDataHora(r.confirmed_at)}</span>.
            </p>
          )}
        </Secao>
      )}
    </main>
  );
}

export default function ReuniaoPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <ReuniaoConteudo params={params} />
    </Suspense>
  );
}
