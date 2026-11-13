import { NextResponse, type NextRequest } from "next/server";
import { utcCompacto } from "@/lib/reunioes";
import { createClient } from "@/lib/supabase/server";

// Convite .ics da reunião agendada (abre no Google Agenda, Outlook, Apple Calendário).
function escapar(t: string): string {
  return t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("interactions")
    .select("id, title, occurred_at, duracao_minutos, local, summary, participantes")
    .eq("id", id)
    .eq("status", "agendada")
    .maybeSingle();
  if (!r) return new NextResponse("Reunião agendada não encontrada.", { status: 404 });

  const ini = new Date(r.occurred_at);
  const fim = new Date(ini.getTime() + (r.duracao_minutos ?? 60) * 60_000);
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sincra//Plataforma interna//PT-BR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@plataforma.sincra`,
    `DTSTAMP:${utcCompacto(new Date())}`,
    `DTSTART:${utcCompacto(ini)}`,
    `DTEND:${utcCompacto(fim)}`,
    `SUMMARY:${escapar(r.title ?? "Reunião")}`,
    r.local ? `LOCATION:${escapar(r.local)}` : null,
    r.summary ? `DESCRIPTION:${escapar(r.summary)}` : null,
    ...r.participantes.map((e) => `ATTENDEE;RSVP=TRUE:mailto:${e}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new NextResponse(linhas.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="reuniao-sincra.ics"`,
      "cache-control": "no-store",
    },
  });
}
