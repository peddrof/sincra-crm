"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Fecha o painel lateral com a tecla Esc.
export function FecharComEsc({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") router.push(href, { scroll: false });
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [href, router]);
  return null;
}
