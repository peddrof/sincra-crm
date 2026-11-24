"use server";

import { redirect } from "next/navigation";
import { LOGOUT_ACCESS, accessConfigurado } from "@/lib/cloudflare-access";
import { createClient } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Publicada: encerra também a sessão do Cloudflare Access; senão o login único entraria de novo na hora.
  redirect(accessConfigurado ? LOGOUT_ACCESS : "/login");
}
