"use client";

import { useRef, useState, useTransition } from "react";
import { registrarArquivo } from "@/lib/actions/documentos";
import { DOCUMENTO_MAX_BYTES } from "@/lib/documentos";
import { createClient } from "@/lib/supabase/client";

// Envia o arquivo direto do navegador para o Storage privado (sem passar pelo limite do servidor)
// e depois registra o documento no item. A política do bucket exige sócio ativo.
export function EnviarArquivo({
  itemId,
  pasta,
  rotulo,
}: {
  itemId: string;
  pasta: string; // "<organização>/<lista>/"
  rotulo: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    if (arquivo.size > DOCUMENTO_MAX_BYTES) {
      setErro("O arquivo passa de 25 MB.");
      return;
    }
    iniciar(async () => {
      const nomeSeguro = arquivo.name.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
      const path = `${pasta}${itemId}-${crypto.randomUUID()}-${nomeSeguro}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("documentos")
        .upload(path, arquivo, { contentType: arquivo.type || "application/octet-stream" });
      if (error) {
        setErro("Não foi possível enviar o arquivo. Tente de novo.");
        return;
      }
      const r = await registrarArquivo({ itemId, path, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size });
      if (r.erro) setErro(r.erro);
      if (entrada.current) entrada.current.value = "";
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={entrada}
        type="file"
        aria-label={rotulo}
        className="sr-only"
        onChange={(e) => escolher(e.target.files?.[0])}
        disabled={enviando}
      />
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        disabled={enviando}
        className="h-9 rounded-full border border-linha bg-white px-4 text-sm font-semibold text-tinta hover:bg-superficie disabled:cursor-wait disabled:text-cinza"
      >
        {enviando ? "Enviando…" : rotulo}
      </button>
      {erro && (
        <p role="alert" className="text-xs font-medium text-critico">
          {erro}
        </p>
      )}
    </div>
  );
}
