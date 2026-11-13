import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens.
    // Tudo, menos arquivos estáticos, imagens e os dados públicos do mapa (/geo).
    "/((?!_next/static|_next/image|favicon.ico|geo/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
