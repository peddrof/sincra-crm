"use client";

import { useState, useTransition } from "react";
import { apagarDeVez, esvaziarLixeira, restaurarTarefa } from "@/lib/actions/tarefas";

export type ItemLixeira = { id: string; titulo: string; responsavel: string; apagadaPor: string; apagadaEm: string };

// Lixeira de tarefas: restaurar, apagar de vez (pede confirmação no próprio botão) e esvaziar.
export function Lixeira({ itens }: { itens: ItemLixeira[] }) {
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const rodar = (fn: () => Promise<{ erro?: string }>) =>
    iniciar(async () => {
      setErro(null);
      const r = await fn();
      if (r.erro) setErro(r.erro);
      setConfirmar(null);
    });

  if (itens.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-linha p-8 text-center text-sm text-cinza">
        A lixeira está vazia. Tarefas mandadas para a lixeira ficam aqui até alguém restaurar ou apagar de vez.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-tinta-3">
          {itens.length} {itens.length === 1 ? "tarefa" : "tarefas"} na lixeira. Apagar de vez remove a tarefa e as etapas, sem volta.
        </p>
        {confirmar === "tudo" ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(esvaziarLixeira)}
              className="rounded-campo bg-critico px-3 py-1.5 text-sm font-semibold text-white"
            >
              Apagar {itens.length} de vez
            </button>
            <button type="button" onClick={() => setConfirmar(null)} className="text-sm font-semibold text-tinta-3">
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmar("tudo")} className="text-sm font-semibold text-critico">
            Esvaziar lixeira
          </button>
        )}
      </div>
      {erro && (
        <p role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm text-critico">
          {erro}
        </p>
      )}
      <ul className="flex flex-col divide-y divide-linha overflow-hidden rounded-xl border border-linha bg-white shadow-cartao">
        {itens.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium text-tinta">{t.titulo}</span>
              <span className="text-xs text-cinza">
                {t.responsavel} · na lixeira desde {t.apagadaEm}, por {t.apagadaPor}
              </span>
            </div>
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(() => restaurarTarefa(t.id))}
              className="rounded-campo bg-azul-50 px-3 py-1.5 text-sm font-semibold text-sincra-tinta hover:bg-azul-100"
            >
              Restaurar
            </button>
            {confirmar === t.id ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pendente}
                  onClick={() => rodar(() => apagarDeVez(t.id))}
                  className="rounded-campo bg-critico px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmar(null)} className="text-sm font-semibold text-tinta-3">
                  Não
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmar(t.id)} className="text-sm font-semibold text-tinta-3 hover:text-critico">
                Apagar de vez
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
