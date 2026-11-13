import "server-only";
import { googleFetch } from "./oauth";

// Drive v3 via REST. Regras do projeto: só grava dentro das pastas de clientes; nunca apaga nem move nada.

const API = "https://www.googleapis.com/drive/v3";
const PASTA = "application/vnd.google-apps.folder";

export type ArquivoDrive = { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink?: string };

function escaparConsulta(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// Pasta do cliente dentro de GOOGLE_DRIVE_CLIENTES_FOLDER_ID: reaproveita a de mesmo nome, senão cria.
export async function garantirPastaDoCliente(nome: string, idSalvo: string | null): Promise<string> {
  const raiz = process.env.GOOGLE_DRIVE_CLIENTES_FOLDER_ID;
  if (!raiz) throw new Error("GOOGLE_DRIVE_CLIENTES_FOLDER_ID ausente no .env.local.");

  if (idSalvo) {
    const r = await googleFetch(`${API}/files/${idSalvo}?fields=id,trashed`).catch(() => null);
    const f = r ? ((await r.json()) as { id: string; trashed?: boolean }) : null;
    if (f && !f.trashed) return f.id;
  }

  const q = `'${raiz}' in parents and mimeType = '${PASTA}' and name = '${escaparConsulta(nome)}' and trashed = false`;
  const lista = (await (await googleFetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`)).json()) as {
    files: { id: string }[];
  };
  if (lista.files[0]) return lista.files[0].id;

  const criada = (await (
    await googleFetch(`${API}/files?fields=id`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: nome, mimeType: PASTA, parents: [raiz] }),
    })
  ).json()) as { id: string };
  return criada.id;
}

// Upload simples (multipart) até ~25 MB, que é o limite dos documentos da plataforma.
export async function enviarArquivo(pastaId: string, nome: string, tipo: string, conteudo: Blob): Promise<{ id: string; webViewLink: string }> {
  const fronteira = `sincra-${crypto.randomUUID()}`;
  const meta = JSON.stringify({ name: nome, parents: [pastaId] });
  const corpo = new Blob([
    `--${fronteira}\r\ncontent-type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${fronteira}\r\ncontent-type: ${tipo || "application/octet-stream"}\r\n\r\n`,
    conteudo,
    `\r\n--${fronteira}--`,
  ]);
  const r = await googleFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
    method: "POST",
    headers: { "content-type": `multipart/related; boundary=${fronteira}` },
    body: corpo,
  });
  return r.json();
}

// Transcrições: arquivos de texto ou Google Docs na pasta GOOGLE_DRIVE_TRANSCRICOES_FOLDER_ID, mais recentes primeiro.
export async function listarTranscricoes(): Promise<ArquivoDrive[]> {
  const pasta = process.env.GOOGLE_DRIVE_TRANSCRICOES_FOLDER_ID;
  if (!pasta) throw new Error("GOOGLE_DRIVE_TRANSCRICOES_FOLDER_ID ausente no .env.local.");
  const q = `'${pasta}' in parents and trashed = false and mimeType != '${PASTA}'`;
  const r = await googleFetch(
    `${API}/files?q=${encodeURIComponent(q)}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,mimeType,modifiedTime,webViewLink)`,
  );
  return ((await r.json()) as { files: ArquivoDrive[] }).files;
}

// Texto da transcrição: Google Docs é exportado como texto; .txt/.vtt/.srt baixados direto.
export async function lerTexto(arquivo: { id: string; mimeType: string }): Promise<string> {
  const url =
    arquivo.mimeType === "application/vnd.google-apps.document"
      ? `${API}/files/${arquivo.id}/export?mimeType=text/plain`
      : `${API}/files/${arquivo.id}?alt=media`;
  return (await googleFetch(url)).text();
}

export async function metadados(id: string): Promise<ArquivoDrive> {
  return (await googleFetch(`${API}/files/${id}?fields=id,name,mimeType,modifiedTime,webViewLink`)).json();
}
