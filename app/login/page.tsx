import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar · Sincra" };

// Login é comunicação: o brandbook permite o céu (um por tela) e a Plus Jakarta Sans no título.
export default function LoginPage() {
  return (
    <main
      className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "var(--sincra-ceu)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 12% 0%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 45%)" }}
      />
      <div className="relative flex w-full max-w-sm flex-col gap-6 rounded-cartao-lg bg-white p-8 shadow-destaque">
        <Logo />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em] text-tinta">
            Entrar na plataforma
          </h1>
          <p className="text-sm leading-[22px] font-medium text-tinta">
            <span className="text-cinza">Acesso só para os sócios.</span> Entre com seu e-mail e senha.
          </p>
        </div>
        <Suspense fallback={<div className="h-[212px]" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
