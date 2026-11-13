import { NextResponse, type NextRequest } from "next/server";
import { anexoDe } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

// Download de anexo do feed: confere o evento pela RLS (só sócio ativo enxerga) e redireciona
// para um link assinado de 60 segundos. O bucket é privado; não existe link permanente.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase.from("activity_events").select("payload").eq("id", id).maybeSingle();
  const anexo = evento ? anexoDe(evento.payload) : null;
  if (!anexo) return new NextResponse("Anexo não encontrado.", { status: 404 });

  const { data, error } = await supabase.storage
    .from("feed-anexos")
    .createSignedUrl(anexo.path, 60, { download: anexo.nome });
  if (error || !data) return new NextResponse("Anexo indisponível.", { status: 404 });

  return NextResponse.redirect(data.signedUrl, { headers: { "cache-control": "no-store" } });
}
