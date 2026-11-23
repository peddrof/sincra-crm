import type { Metadata } from "next";
import { Suspense } from "react";
import { Carregando } from "@/components/Carregando";
import { Secao } from "@/components/campos";
import { formatarDataHora, nomeCurto } from "@/lib/crm";
import { valorDaConfiguracao } from "@/lib/negocios";
import { createClient } from "@/lib/supabase/server";
import { DriveLocalSecao } from "./DriveLocalSecao";
import { GoogleSecao } from "./GoogleSecao";
import { PrazosForm } from "./PrazosForm";
import { SenhaForm } from "./SenhaForm";
import { driveLocalConfigurado } from "@/lib/drive-local";
import { TaxasForm } from "./TaxasForm";

export const metadata: Metadata = { title: "Configurações · Sincra" };

async function ConfiguracoesConteudo({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { google: situacao } = await searchParams;
  const supabase = await createClient();
  const [{ data: config }, { data: socios }] = await Promise.all([
    supabase
      .from("settings")
      .select("key, value, updated_at, editor:profiles!settings_updated_by_fkey(full_name, nickname)")
      .in("key", [
        "default_rate_hospital",
        "default_rate_medico",
        "followup_negocio_parado_dias",
        "followup_documento_pendente_dias",
        "followup_sem_contato_dias",
      ]),
    supabase.from("profiles").select("id, full_name, nickname, active").order("full_name"),
  ]);

  const taxa = (chave: string) => valorDaConfiguracao(config?.find((c) => c.key === chave)?.value)?.toLocaleString("pt-BR") ?? "";
  const ultima = [...(config ?? [])]
    .filter((c) => c.key.startsWith("default_rate"))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-sincra-tinta">Plataforma</p>
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.02em]">Configurações</h1>
      </div>

      <Secao titulo="Taxas padrão">
        <p className="text-sm leading-[22px] text-tinta-3">
          Valem para negócios sem taxa própria. Cada negócio pode ter a sua.
          {ultima && (
            <span className="text-cinza">
              {" "}
              Última alteração: {ultima.editor ? nomeCurto(ultima.editor) : "migração inicial"},{" "}
              <span className="tabular">{formatarDataHora(ultima.updated_at)}</span>.
            </span>
          )}
        </p>
        <TaxasForm hospital={taxa("default_rate_hospital")} medico={taxa("default_rate_medico")} />
      </Secao>

      <Secao titulo="Prazos dos alertas">
        <p className="text-sm leading-[22px] text-tinta-3">
          Todo dia às 8h os alertas vencidos entram no feed, mencionando o responsável. Tarefa atrasada não tem prazo: avisa
          no dia seguinte ao vencimento.
        </p>
        <PrazosForm
          valores={{
            followup_negocio_parado_dias: taxa("followup_negocio_parado_dias"),
            followup_documento_pendente_dias: taxa("followup_documento_pendente_dias"),
            followup_sem_contato_dias: taxa("followup_sem_contato_dias"),
          }}
        />
      </Secao>

      <Secao titulo="Google (Drive e agenda)">
        <GoogleSecao situacao={situacao} />
      </Secao>

      {/* Pasta sincronizada: só no PC em que ela existe (variáveis DRIVE_LOCAL_* no .env.local). */}
      {driveLocalConfigurado() && (
        <Secao titulo="Drive (pasta sincronizada neste computador)">
          <DriveLocalSecao />
        </Secao>
      )}

      <Secao titulo="Minha senha">
        <SenhaForm />
      </Secao>

      <Secao titulo="Sócios com acesso">
        <ul className="flex flex-col divide-y divide-linha">
          {socios?.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <span className="text-sm text-tinta">{s.full_name}</span>
              <span className={`text-xs font-semibold ${s.active ? "text-ok" : "text-cinza"}`}>{s.active ? "Ativo" : "Inativo"}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-4 text-cinza">Para liberar um sócio novo, siga o passo a passo do README (painel do Supabase).</p>
      </Secao>
    </main>
  );
}

export default function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  return (
    <Suspense fallback={<Carregando />}>
      <ConfiguracoesConteudo searchParams={searchParams} />
    </Suspense>
  );
}
