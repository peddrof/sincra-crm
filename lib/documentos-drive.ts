import "server-only";
import { driveLocalDisponivel, gravarNoCliente, pastaDoCliente } from "@/lib/drive-local";
import { garantirPastaDoCliente, enviarArquivo } from "@/lib/google/drive";
import { tokenDeAcesso } from "@/lib/google/oauth";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Decisão #6: documento de cliente mora na pasta do cliente no Drive. Dois caminhos:
// 1. API do Google conectada (quando publicar): envia pela API.
// 2. Pasta sincronizada no PC (G:\Meu Drive\ORG. SINCRA\60 Documentos\Clientes\<org>): grava no disco
//    e o app Google Drive sobe para a nuvem.
// Em ambos: grava drive_file_id (ou "local:<caminho>") e apaga a cópia temporária do Storage.
// Sem nenhum dos dois, não faz nada: o arquivo segue no Storage e o download continua funcionando.
export async function copiarDocumentoParaDrive(
  supabase: Cliente,
  documentoId: string,
): Promise<"copiado" | "sem_drive" | "erro"> {
  try {
    const temApi = Boolean(await tokenDeAcesso().catch(() => null));
    const temLocal = !temApi && (await driveLocalDisponivel());
    if (!temApi && !temLocal) return "sem_drive";

    const { data: doc } = await supabase
      .from("documents")
      .select("id, title, mime_type, storage_path, drive_file_id, organization:organizations(id, trade_name, drive_folder_id)")
      .eq("id", documentoId)
      .maybeSingle();
    if (!doc?.storage_path || doc.drive_file_id || !doc.organization) return "erro";

    const { data: arquivo, error } = await supabase.storage.from("documentos").download(doc.storage_path);
    if (error || !arquivo) throw new Error(error?.message ?? "arquivo sumiu do Storage");
    const nome = doc.storage_path.split("/").pop()?.replace(/^[0-9a-f-]{36}-[0-9a-f-]{36}-/, "") ?? doc.title;

    let referencia: string;
    let pasta: string;
    if (temApi) {
      pasta = await garantirPastaDoCliente(doc.organization.trade_name, doc.organization.drive_folder_id);
      referencia = (await enviarArquivo(pasta, nome, doc.mime_type ?? "application/octet-stream", arquivo)).id;
    } else {
      pasta = await pastaDoCliente(doc.organization.trade_name);
      referencia = await gravarNoCliente(doc.organization.trade_name, nome, new Uint8Array(await arquivo.arrayBuffer()));
    }

    if (pasta !== doc.organization.drive_folder_id) {
      await supabase.from("organizations").update({ drive_folder_id: pasta }).eq("id", doc.organization.id);
    }
    await supabase.from("documents").update({ drive_file_id: referencia, storage_path: null }).eq("id", doc.id);
    await supabase.storage.from("documentos").remove([doc.storage_path]);
    return "copiado";
  } catch (e) {
    console.error("[drive] falha ao copiar documento:", documentoId, e instanceof Error ? e.message : e);
    return "erro";
  }
}
