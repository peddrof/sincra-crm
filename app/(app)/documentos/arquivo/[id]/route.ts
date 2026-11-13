import { NextResponse, type NextRequest } from "next/server";
import { abrirArquivoLocal, PREFIXO } from "@/lib/drive-local";
import { createClient } from "@/lib/supabase/server";

// Download de documento de cliente. Confere o registro pela RLS (só sócio ativo enxerga).
// - Pasta sincronizada ("local:..."): entrega o arquivo direto do disco (só com a plataforma rodando no PC do Felipe).
// - Drive pela API: abre o arquivo no Drive.
// - Ainda no Storage: link assinado de 60 segundos (bucket privado).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: doc } = await supabase.from("documents").select("storage_path, drive_file_id").eq("id", id).maybeSingle();
  if (!doc) return new NextResponse("Documento não encontrado.", { status: 404 });

  if (doc.drive_file_id?.startsWith(PREFIXO)) {
    try {
      const a = await abrirArquivoLocal(doc.drive_file_id);
      return new NextResponse(a.stream, {
        headers: {
          "content-type": "application/octet-stream",
          "content-length": String(a.tamanho),
          "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.nome)}`,
          "cache-control": "no-store",
        },
      });
    } catch {
      return new NextResponse("Arquivo não encontrado na pasta sincronizada deste computador.", { status: 404 });
    }
  }

  if (doc.drive_file_id) {
    return NextResponse.redirect(`https://drive.google.com/file/d/${doc.drive_file_id}/view`, {
      headers: { "cache-control": "no-store" },
    });
  }
  if (!doc.storage_path) return new NextResponse("Documento sem arquivo.", { status: 404 });

  const nome = doc.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-[0-9a-f-]{36}-/, "") ?? "documento";
  const { data, error } = await supabase.storage.from("documentos").createSignedUrl(doc.storage_path, 60, { download: nome });
  if (error || !data) return new NextResponse("Documento indisponível.", { status: 404 });

  return NextResponse.redirect(data.signedUrl, { headers: { "cache-control": "no-store" } });
}
