import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { sair } from "@/lib/actions/sessao";

export const metadata: Metadata = { title: "Sem acesso · Sincra" };

// Quem tem login no Supabase, mas não tem perfil ativo de sócio em `profiles`.
export default function SemAcessoPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-superficie px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-cartao-lg border border-linha bg-white p-8 shadow-cartao">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl leading-7 font-semibold tracking-[-0.02em]">Acesso não liberado</h1>
          <p className="text-sm leading-[22px] text-tinta-3">
            Seu e-mail entrou, mas não está ativo como sócio na plataforma. Peça a um sócio para liberar o seu perfil.
          </p>
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="h-11 w-full rounded-full border border-linha bg-white px-5 text-sm font-semibold text-tinta transition-colors hover:bg-superficie"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
