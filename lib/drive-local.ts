import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// Drive pela pasta sincronizada do Google Drive para computador (unidade G:), decidido em 11/11/2026
// porque o OAuth do Google não foi possível. Só funciona com a plataforma rodando no PC do Felipe.
// Regras: só cria pastas e grava arquivos novos dentro de DRIVE_LOCAL_CLIENTES; lê só DRIVE_LOCAL_TRANSCRICOES;
// nunca apaga, move ou sobrescreve nada do vault.
// Referências guardadas no banco: "local:<caminho relativo à raiz, com />".

export const PREFIXO = "local:";

function raiz(): string | null {
  return process.env.DRIVE_LOCAL_RAIZ || null;
}

export function driveLocalConfigurado(): boolean {
  return Boolean(raiz() && process.env.DRIVE_LOCAL_CLIENTES && process.env.DRIVE_LOCAL_TRANSCRICOES);
}

export async function driveLocalDisponivel(): Promise<boolean> {
  const r = raiz();
  if (!r || !driveLocalConfigurado()) return false;
  return stat(/*turbopackIgnore: true*/ r).then((s) => s.isDirectory()).catch(() => false);
}

// Caminho absoluto a partir de uma referência "local:", recusando qualquer coisa fora da raiz.
function absoluto(ref: string): string {
  const r = raiz();
  if (!r) throw new Error("DRIVE_LOCAL_RAIZ ausente no .env.local.");
  const rel = ref.startsWith(PREFIXO) ? ref.slice(PREFIXO.length) : ref;
  const abs = path.resolve(/*turbopackIgnore: true*/ r, rel);
  if (abs !== path.resolve(/*turbopackIgnore: true*/ r) && !abs.startsWith(path.resolve(/*turbopackIgnore: true*/ r) + path.sep)) throw new Error("Caminho fora da pasta da Sincra.");
  return abs;
}

function referencia(abs: string): string {
  return PREFIXO + path.relative(raiz()!, abs).split(path.sep).join("/");
}

// Nome válido no Windows e no Drive.
function nomeSeguro(nome: string): string {
  const limpo = nome.replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return (limpo || "sem nome").slice(0, 120);
}

export async function pastaDoCliente(nomeOrganizacao: string): Promise<string> {
  const pasta = path.join(/*turbopackIgnore: true*/ absoluto(process.env.DRIVE_LOCAL_CLIENTES ?? ""), nomeSeguro(nomeOrganizacao));
  await mkdir(/*turbopackIgnore: true*/ pasta, { recursive: true });
  return referencia(pasta);
}

// Grava sem sobrescrever: se o nome existe, acrescenta " (2)", " (3)"...
export async function gravarNoCliente(nomeOrganizacao: string, nomeArquivo: string, conteudo: Uint8Array): Promise<string> {
  const pasta = absoluto(await pastaDoCliente(nomeOrganizacao));
  const { name, ext } = path.parse(nomeSeguro(nomeArquivo));
  for (let n = 1; n < 1000; n++) {
    const destino = path.join(/*turbopackIgnore: true*/ pasta, n === 1 ? `${name}${ext}` : `${name} (${n})${ext}`);
    try {
      await writeFile(/*turbopackIgnore: true*/ destino, conteudo, { flag: "wx" });
      return referencia(destino);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
  }
  throw new Error("Não foi possível escolher um nome livre para o arquivo.");
}

export type ArquivoLocal = { id: string; name: string; modifiedTime: string; legivel: boolean };

const LEGIVEIS = new Set([".md", ".txt", ".vtt", ".srt"]);

// Transcrições na pasta (sem subpastas), mais recentes primeiro. .gdoc é só um atalho: não dá para ler.
export async function listarTranscricoesLocais(): Promise<ArquivoLocal[]> {
  const pasta = absoluto(process.env.DRIVE_LOCAL_TRANSCRICOES ?? "");
  const nomes = await readdir(/*turbopackIgnore: true*/ pasta, { withFileTypes: true });
  const arquivos = await Promise.all(
    nomes
      .filter((d) => d.isFile() && !d.name.startsWith(".") && !/^(desktop\.ini|thumbs\.db)$/i.test(d.name))
      .map(async (d) => {
        const abs = path.join(/*turbopackIgnore: true*/ pasta, d.name);
        const s = await stat(/*turbopackIgnore: true*/ abs);
        return {
          id: referencia(abs),
          name: d.name,
          modifiedTime: s.mtime.toISOString(),
          legivel: LEGIVEIS.has(path.extname(d.name).toLowerCase()),
        };
      }),
  );
  return arquivos.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
}

export async function metadadosLocais(ref: string): Promise<ArquivoLocal> {
  const abs = absoluto(ref);
  const s = await stat(/*turbopackIgnore: true*/ abs);
  return { id: ref, name: path.basename(abs), modifiedTime: s.mtime.toISOString(), legivel: LEGIVEIS.has(path.extname(abs).toLowerCase()) };
}

export async function lerTextoLocal(ref: string): Promise<string> {
  const abs = absoluto(ref);
  if (!LEGIVEIS.has(path.extname(abs).toLowerCase())) {
    throw new Error("Formato não legível pela plataforma. Salve a transcrição como .md ou .txt.");
  }
  return readFile(/*turbopackIgnore: true*/ abs, "utf8");
}

export async function abrirArquivoLocal(ref: string): Promise<{ stream: ReadableStream; nome: string; tamanho: number }> {
  const abs = absoluto(ref);
  const s = await stat(/*turbopackIgnore: true*/ abs);
  const stream = createReadStream(/*turbopackIgnore: true*/ abs) as unknown as AsyncIterable<Uint8Array>;
  return {
    stream: new ReadableStream({
      async start(c) {
        for await (const parte of stream) c.enqueue(parte);
        c.close();
      },
    }),
    nome: path.basename(abs),
    tamanho: s.size,
  };
}

export function caminhoLegivel(ref: string): string {
  return ref.startsWith(PREFIXO) ? ref.slice(PREFIXO.length) : ref;
}
