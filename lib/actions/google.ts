"use server";

import { refresh } from "next/cache";
import { getSocio } from "@/lib/auth";
import { desconectar } from "@/lib/google/oauth";
import { createClient } from "@/lib/supabase/server";

export async function desconectarGoogle() {
  const socio = await getSocio();
  await desconectar();
  const supabase = await createClient();
  await supabase.from("activity_events").insert({
    actor_type: "user",
    actor_id: socio.id,
    event_type: "integration.google_disconnected",
    area: "geral",
    entity_type: "settings",
    summary: `${socio.apelido ?? socio.nome.split(" ")[0]} desconectou o Google`,
  });
  refresh();
}
