import "server-only";
import { googleFetch } from "./oauth";

export type EventoAgenda = {
  id: string;
  titulo: string;
  inicio: string; // ISO (dateTime) ou AAAA-MM-DD (dia inteiro)
  diaInteiro: boolean;
  link: string | null;
  convidados: string[]; // e-mails
};

// Próximas reuniões da agenda principal da conta conectada.
export async function proximosEventos(dias = 7): Promise<EventoAgenda[]> {
  const agora = new Date();
  const fim = new Date(agora.getTime() + dias * 86_400_000);
  const p = new URLSearchParams({
    timeMin: agora.toISOString(),
    timeMax: fim.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "15",
  });
  const r = await googleFetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${p}`);
  const dados = (await r.json()) as {
    items: {
      id: string;
      summary?: string;
      status?: string;
      start: { dateTime?: string; date?: string };
      hangoutLink?: string;
      htmlLink?: string;
      attendees?: { email?: string; self?: boolean }[];
    }[];
  };
  return dados.items
    .filter((e) => e.status !== "cancelled")
    .map((e) => ({
      id: e.id,
      titulo: e.summary ?? "Sem título",
      inicio: e.start.dateTime ?? e.start.date ?? "",
      diaInteiro: !e.start.dateTime,
      link: e.hangoutLink ?? e.htmlLink ?? null,
      convidados: (e.attendees ?? []).filter((a) => !a.self && a.email).map((a) => a.email!.toLowerCase()),
    }));
}
