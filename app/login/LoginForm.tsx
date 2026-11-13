"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { enviarLink, type EstadoLogin } from "./actions";

const inicial: EstadoLogin = { status: "inicial" };

const mensagensDaUrl: Record<string, string> = {
  link: "O link expirou ou já foi usado. Peça um novo.",
};

export function LoginForm() {
  const [estado, acao, pendente] = useActionState(enviarLink, inicial);
  const erroUrl = mensagensDaUrl[useSearchParams().get("erro") ?? ""];

  if (estado.status === "enviado") {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-campo bg-andamento-bg p-4">
        <p className="text-sm leading-[22px] font-semibold text-tinta">Confira seu e-mail</p>
        <p className="text-sm leading-[22px] text-tinta-3">
          Se <span className="font-medium text-tinta">{estado.email}</span> tiver acesso, o link chega em instantes.
          Abra o link neste mesmo navegador.
        </p>
      </div>
    );
  }

  const mensagemErro = estado.status === "erro" ? estado.mensagem : erroUrl;

  return (
    <form action={acao} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-xs leading-4 font-semibold text-tinta-2">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={estado.status === "erro" ? estado.email : ""}
          aria-invalid={estado.status === "erro"}
          aria-describedby={mensagemErro ? "login-erro" : undefined}
          placeholder="nome@exemplo.com"
          className="h-11 rounded-campo border border-linha bg-white px-3 text-sm text-tinta outline-none placeholder:text-cinza focus:border-sincra focus:ring-3 focus:ring-azul-100"
        />
      </div>

      {mensagemErro && (
        <p id="login-erro" role="alert" className="rounded-campo bg-critico-bg px-3 py-2 text-sm leading-[22px] text-critico">
          {mensagemErro}
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className="h-11 rounded-full bg-sincra px-5 text-sm font-semibold text-white transition-colors hover:bg-sincra-tinta disabled:cursor-wait disabled:bg-azul-300"
      >
        {pendente ? "Enviando link…" : "Enviar link de acesso"}
      </button>
    </form>
  );
}
