"use client";

import { useEffect, useRef } from "react";

const MENSAGEM = "Sair sem salvar? As informações preenchidas neste formulário serão perdidas.";

// Coloque dentro de um <form>. Depois que algo é digitado, pede confirmação ao:
// - fechar ou recarregar a aba (beforeunload);
// - clicar em qualquer link interno (menu, abas, "Cancelar").
// Ao enviar o formulário, o aviso é desligado.
export function AvisoAlteracoes() {
  const marcador = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = marcador.current?.closest("form");
    if (!form) return;
    let alterado = false;

    const marcar = () => {
      alterado = true;
    };
    const enviar = () => {
      alterado = false;
    };
    const antesDeSair = (e: BeforeUnloadEvent) => {
      if (!alterado) return;
      e.preventDefault();
      e.returnValue = MENSAGEM;
    };
    const cliqueEmLink = (e: MouseEvent) => {
      if (!alterado || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = (e.target as HTMLElement | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const destino = new URL(link.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (!window.confirm(MENSAGEM)) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        alterado = false;
      }
    };

    form.addEventListener("input", marcar);
    form.addEventListener("change", marcar);
    form.addEventListener("submit", enviar);
    window.addEventListener("beforeunload", antesDeSair);
    document.addEventListener("click", cliqueEmLink, true);
    return () => {
      form.removeEventListener("input", marcar);
      form.removeEventListener("change", marcar);
      form.removeEventListener("submit", enviar);
      window.removeEventListener("beforeunload", antesDeSair);
      document.removeEventListener("click", cliqueEmLink, true);
    };
  }, []);

  return <span ref={marcador} hidden />;
}
