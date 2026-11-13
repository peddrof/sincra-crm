"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { AvisoAlteracoes } from "@/components/AvisoAlteracoes";
import { classeAreaTexto, classeBotaoPrimario, classeCampo } from "@/components/campos";
import { agendar, importarDoDrive, importarTexto, type EstadoReuniao } from "@/lib/actions/reunioes";
import { CONTEXTOS, type Contexto } from "@/lib/reunioes";

export type OrgOpcao = { id: string; nome: string; tipo: string };
export type NegocioOpcao = { id: string; nome: string; orgId: string };

// Tipo da reunião + organização + negócio. Organização é obrigatória só "com organização";
// "com o fundo" oferece as organizações do tipo fundo; "interna" não pede nenhuma.
function Vinculo({
  orgs,
  negocios,
  inicial,
}: {
  orgs: OrgOpcao[];
  negocios: NegocioOpcao[];
  inicial?: { contexto?: Contexto; org?: string; negocio?: string };
}) {
  const [contexto, setContexto] = useState<Contexto>(inicial?.contexto ?? "organizacao");
  const [org, setOrg] = useState(inicial?.org ?? "");
  const opcoes = contexto === "fundo" ? orgs.filter((o) => o.tipo === "fundo") : orgs;
  const daOrg = negocios.filter((n) => n.orgId === org);

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-xs font-semibold text-tinta-2">Tipo de reunião</legend>
        {CONTEXTOS.map((c) => (
          <label
            key={c.valor}
            className={`flex cursor-pointer flex-col rounded-campo border px-3 py-2 text-sm ${
              contexto === c.valor ? "border-sincra bg-azul-50 text-sincra-tinta" : "border-linha bg-white text-tinta-3"
            }`}
          >
            <span className="flex items-center gap-2 font-semibold">
              <input
                type="radio"
                name="contexto"
                value={c.valor}
                checked={contexto === c.valor}
                onChange={() => {
                  setContexto(c.valor);
                  setOrg("");
                }}
                className="accent-sincra"
              />
              {c.rotulo}
            </span>
            <span className="text-xs text-cinza">{c.ajuda}</span>
          </label>
        ))}
      </fieldset>
      {contexto !== "interna" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            {contexto === "fundo" ? "Fundo (opcional)" : "Organização"}
            <select
              name="organization_id"
              required={contexto === "organizacao"}
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className={classeCampo}
            >
              <option value="" disabled={contexto === "organizacao"}>
                {contexto === "fundo" ? (opcoes.length ? "Nenhum específico" : "Nenhum fundo cadastrado") : "Escolha"}
              </option>
              {opcoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Negócio
            <select name="deal_id" key={org} defaultValue={inicial?.negocio ?? ""} disabled={daOrg.length === 0} className={classeCampo}>
              <option value="">{daOrg.length ? "Nenhum" : "Sem negócio aberto"}</option>
              {daOrg.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

export function ImportarDriveForm({
  arquivoId,
  orgs,
  negocios,
  interacaoId,
}: {
  arquivoId: string;
  orgs: OrgOpcao[];
  negocios: NegocioOpcao[];
  interacaoId?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoReuniao, FormData>(importarDoDrive, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="drive_file_id" value={arquivoId} />
      {interacaoId ? <input type="hidden" name="interaction_id" value={interacaoId} /> : <Vinculo orgs={orgs} negocios={negocios} />}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Enviando…" : interacaoId ? "Usar esta transcrição" : "Analisar"}
        </button>
      </div>
      {estado.erro && <p className="text-xs font-medium text-critico">{estado.erro}</p>}
    </form>
  );
}

export function ColarForm({ orgs, negocios, interacaoId }: { orgs: OrgOpcao[]; negocios: NegocioOpcao[]; interacaoId?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoReuniao, FormData>(importarTexto, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <AvisoAlteracoes />
      {interacaoId ? (
        <input type="hidden" name="interaction_id" value={interacaoId} />
      ) : (
        <>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
            Título
            <input name="title" placeholder="Reunião de apresentação" className={classeCampo} />
          </label>
          <Vinculo orgs={orgs} negocios={negocios} />
        </>
      )}
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Transcrição
        <textarea name="texto" required className={`${classeAreaTexto} min-h-48`} placeholder="Cole aqui o texto da transcrição." />
      </label>
      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Enviando…" : "Analisar transcrição"}
        </button>
      </div>
    </form>
  );
}

type Pessoa = { email: string; nome: string; orgId: string | null };

export function AgendarForm({
  orgs,
  negocios,
  pessoas,
  socios,
  socioAtual,
  inicial,
}: {
  orgs: OrgOpcao[];
  negocios: NegocioOpcao[];
  pessoas: Pessoa[];
  socios: { id: string; nome: string }[];
  socioAtual: string;
  inicial?: { contexto?: Contexto; org?: string; negocio?: string; data: string };
}) {
  const [estado, acao, pendente] = useActionState<EstadoReuniao, FormData>(agendar, {});
  return (
    <form action={acao} className="flex flex-col gap-5">
      <AvisoAlteracoes />
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Título
        <input name="title" required placeholder="Apresentação da Sincra" className={classeCampo} />
      </label>
      <Vinculo orgs={orgs} negocios={negocios} inicial={inicial} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Data
          <input type="date" name="data" required defaultValue={inicial?.data} className={`${classeCampo} tabular`} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Hora
          <input type="time" name="hora" required defaultValue="10:00" className={`${classeCampo} tabular`} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
          Duração
          <select name="duracao" defaultValue="60" className={classeCampo}>
            {[30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Local ou link
        <input name="local" placeholder="Google Meet, endereço ou sala" className={classeCampo} />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-xs font-semibold text-tinta-2">Sócios convidados (recebem a menção no feed)</legend>
        <div className="flex flex-wrap gap-3">
          {socios.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm text-tinta">
              <input type="checkbox" name="socio" value={s.id} defaultChecked={s.id === socioAtual} className="size-4 accent-sincra" />
              {s.nome}
            </label>
          ))}
        </div>
      </fieldset>

      {pessoas.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-xs font-semibold text-tinta-2">Convidados com e-mail cadastrado</legend>
          <div className="flex flex-col gap-1.5">
            {pessoas.map((p) => (
              <label key={p.email} className="flex items-center gap-2 text-sm text-tinta">
                <input type="checkbox" name="participante" value={p.email} defaultChecked={p.orgId === inicial?.org} className="size-4 accent-sincra" />
                {p.nome} <span className="text-cinza">· {p.email}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Outros e-mails (separados por vírgula)
        <input name="outros_emails" className={classeCampo} />
      </label>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-tinta-2">
        Pauta
        <textarea name="notas" className={classeAreaTexto} placeholder="O que será tratado" />
      </label>

      {estado.erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {estado.erro}
        </p>
      )}
      <div>
        <button type="submit" disabled={pendente} className={classeBotaoPrimario}>
          {pendente ? "Agendando…" : "Agendar reunião"}
        </button>
      </div>
    </form>
  );
}

// Recarrega a página de tempos em tempos enquanto o modelo local processa.
export function AtualizarSozinho({ segundos = 10 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(t);
  }, [router, segundos]);
  return null;
}
