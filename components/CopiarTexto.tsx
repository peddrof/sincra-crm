"use client";

import { useState } from "react";

export function CopiarTexto({ texto, rotulo = "Copiar link" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }}
      className="h-8 shrink-0 rounded-full bg-sincra px-3 text-xs font-semibold text-white hover:bg-sincra-tinta"
    >
      {copiado ? "Copiado" : rotulo}
    </button>
  );
}
