import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Inter: toda a interface e o logotipo (Brandbook Sincra, 3.4).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Plus Jakarta Sans: só comunicação (login e PDFs gerados), nunca no miolo do produto.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600"],
});

export const metadata: Metadata = {
  title: "Sincra · Plataforma interna",
  description: "Ferramenta de gestão dos sócios da Sincra.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-sans text-tinta">{children}</body>
    </html>
  );
}
