import "server-only";

// Extração de dados de reunião a partir da transcrição. Dois modos, escolhidos por IA_PROVEDOR:
// - "manual" (padrão, 22/11/2026): os sócios resumem a reunião no Claude ou no ChatGPT, com a assinatura deles,
//   e trazem o texto (.md no Drive ou colado). Se vier no formato JSON do prompt (`promptParaColar`), os campos
//   chegam preenchidos; senão, o texto vira o resumo e o resto é preenchido na revisão. Nenhuma API paga.
// - "ollama": modelo local no PC (decisão #15 original). Só funciona com o app rodando nesse PC.
// Princípio do projeto: a IA só sugere. Nada vira registro sem a confirmação de um sócio.

export type ProximoPasso = { tarefa: string; responsavel: string | null; prazo: string | null };
export type PessoaCitada = { nome: string; cargo: string | null; email: string | null; telefone: string | null };
export type ExtracaoReuniao = {
  resumo: string;
  decisoes: string[];
  proximos_passos: ProximoPasso[];
  pessoas: PessoaCitada[];
};

const ESQUEMA = {
  type: "object",
  properties: {
    resumo: { type: "string" },
    decisoes: { type: "array", items: { type: "string" } },
    proximos_passos: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tarefa: { type: "string" },
          responsavel: { type: ["string", "null"] },
          prazo: { type: ["string", "null"] },
        },
        required: ["tarefa", "responsavel", "prazo"],
      },
    },
    pessoas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nome: { type: "string" },
          cargo: { type: ["string", "null"] },
          email: { type: ["string", "null"] },
          telefone: { type: ["string", "null"] },
        },
        required: ["nome", "cargo", "email", "telefone"],
      },
    },
  },
  required: ["resumo", "decisoes", "proximos_passos", "pessoas"],
};

export type ModoIa = "manual" | "ollama";

export function modoIa(): ModoIa {
  return process.env.IA_PROVEDOR === "ollama" ? "ollama" : "manual";
}

// O Ollama está aberto e o modelo baixado? Responde em até 2 s (usado para avisar antes de analisar).
// No modo manual não há nada para checar.
export async function iaDisponivel(): Promise<{ ok: boolean; motivo?: string }> {
  if (modoIa() === "manual") return { ok: true };
  const url = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const modelo = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
  try {
    const r = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000), cache: "no-store" });
    const { models } = (await r.json()) as { models?: { name: string }[] };
    if (!models?.some((m) => m.name === modelo || m.name === `${modelo}:latest`)) {
      return { ok: false, motivo: `O modelo ${modelo} não está baixado. Rode: ollama pull ${modelo}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, motivo: "O Ollama está fechado. Abra o app Ollama neste computador e recarregue a página." };
  }
}

// ~12 mil tokens de transcrição; o resto é cortado (o modelo local tem contexto limitado).
const LIMITE_CARACTERES = 48_000;

function instrucoes(contexto: { organizacao: string; socios: string[]; hoje: string }): string {
  return [
    "Você lê transcrições de reuniões da Sincra, empresa brasileira de antecipação de recebíveis médicos.",
    `A reunião foi com: ${contexto.organizacao}. Sócios da Sincra: ${contexto.socios.join(", ")}. Hoje é ${contexto.hoje}.`,
    "Devolva somente JSON no formato pedido, em português do Brasil:",
    "- resumo: 3 a 6 frases objetivas, número na frente quando houver (valores, prazos, quantidades).",
    '- decisoes: cada escolha que os participantes fecharam, uma frase por item (pistas: "decidimos", "combinamos", "fechado", "vamos começar com"). Uma decisão também pode aparecer no resumo, mas tem de estar aqui. Lista vazia só se nada foi decidido.',
    "- proximos_passos: ações combinadas. responsavel = nome de um sócio da Sincra se dito; senão null. prazo = AAAA-MM-DD se uma data foi dita; senão null.",
    "- pessoas: pessoas da outra organização citadas com nome, e cargo/e-mail/telefone se ditos; senão null.",
    "Não invente nada que não esteja na transcrição. Não inclua dados de pacientes.",
  ].join("\n");
}

// Prompt para colar no Claude ou no ChatGPT junto com o áudio ou a transcrição. A resposta (JSON) é o que
// se traz para a plataforma.
export function promptParaColar(contexto: { socios: string[]; hoje: string }): string {
  const exemplo = {
    resumo: "…",
    decisoes: ["…"],
    proximos_passos: [{ tarefa: "…", responsavel: "Felipe", prazo: "AAAA-MM-DD" }],
    pessoas: [{ nome: "…", cargo: null, email: null, telefone: null }],
  };
  return [
    instrucoes({ organizacao: "a organização indicada no áudio ou na transcrição", ...contexto }),
    "Formato exato (use null quando não souber):",
    "```json",
    JSON.stringify(exemplo, null, 2),
    "```",
  ].join("\n");
}

// Modo manual: aceita o JSON do prompt (puro, em bloco ```json ou no meio do texto). Se não houver JSON
// reconhecível, o texto inteiro vira o resumo para o sócio editar na revisão.
const LIMITE_RESUMO_MANUAL = 4_000;

function lerManual(texto: string): { extracao: ExtracaoReuniao; cortada: boolean } {
  const candidatos = [
    texto.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1],
    texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1),
  ];
  for (const c of candidatos) {
    if (!c?.trim()) continue;
    try {
      const o = JSON.parse(c) as Record<string, unknown>;
      if (o && typeof o === "object" && "resumo" in o) return { extracao: normalizar(o), cortada: false };
    } catch {
      // segue para o próximo formato
    }
  }
  const limpo = texto.trim();
  return {
    extracao: { resumo: limpo.slice(0, LIMITE_RESUMO_MANUAL), decisoes: [], proximos_passos: [], pessoas: [] },
    cortada: limpo.length > LIMITE_RESUMO_MANUAL,
  };
}

export async function extrairReuniao(
  transcricao: string,
  contexto: { organizacao: string; socios: string[]; hoje: string },
): Promise<{ extracao: ExtracaoReuniao; cortada: boolean }> {
  if (modoIa() === "manual") return lerManual(transcricao);
  const cortada = transcricao.length > LIMITE_CARACTERES;
  const texto = cortada ? transcricao.slice(0, LIMITE_CARACTERES) : transcricao;
  const bruto = await conversarOllama(instrucoes(contexto), `Transcrição:\n\n${texto}`);
  return { extracao: normalizar(bruto), cortada };
}

// Ollama /api/chat em streaming: os cabeçalhos chegam na hora, então o fetch não estoura o tempo
// enquanto o modelo lê uma transcrição longa (minutos neste notebook).
async function conversarOllama(sistema: string, usuario: string): Promise<unknown> {
  const url = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
  const modelo = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
  const r = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: modelo,
      stream: true,
      format: ESQUEMA,
      options: { temperature: 0, num_ctx: 16384 },
      messages: [
        { role: "system", content: sistema },
        { role: "user", content: usuario },
      ],
    }),
  }).catch(() => {
    throw new Error("O Ollama não respondeu. Abra o app Ollama (ou rode `ollama serve`) e tente de novo.");
  });
  if (!r.ok || !r.body) throw new Error(`Ollama respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);

  let conteudo = "";
  let resto = "";
  const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    resto += value;
    const linhas = resto.split("\n");
    resto = linhas.pop() ?? "";
    for (const linha of linhas) {
      if (!linha.trim()) continue;
      const parte = JSON.parse(linha) as { message?: { content?: string }; error?: string };
      if (parte.error) throw new Error(`Ollama: ${parte.error}`);
      conteudo += parte.message?.content ?? "";
    }
  }
  try {
    return JSON.parse(conteudo);
  } catch {
    throw new Error("O modelo não devolveu JSON válido. Tente processar de novo.");
  }
}

// Garante o formato mesmo se o modelo escorregar (campos faltando, tipos errados, datas inválidas).
function normalizar(bruto: unknown): ExtracaoReuniao {
  const o = (bruto ?? {}) as Record<string, unknown>;
  // Tira pontuação solta no começo (o modelo às vezes começa com ": " ou "- ").
  const texto = (v: unknown) => {
    const t = typeof v === "string" ? v.trim().replace(/^[\s:;,.\-–—•]+/, "") : "";
    return t ? t : null;
  };
  const lista = (v: unknown) => (Array.isArray(v) ? v : []);
  const data = (v: unknown) => {
    const t = texto(v);
    return t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
  };
  return {
    resumo: texto(o.resumo) ?? "",
    decisoes: lista(o.decisoes).map(texto).filter((x): x is string => Boolean(x)).slice(0, 20),
    proximos_passos: lista(o.proximos_passos)
      .map((p) => p as Record<string, unknown>)
      .filter((p) => texto(p.tarefa))
      .slice(0, 20)
      .map((p) => ({ tarefa: texto(p.tarefa)!.slice(0, 300), responsavel: texto(p.responsavel), prazo: data(p.prazo) })),
    pessoas: lista(o.pessoas)
      .map((p) => p as Record<string, unknown>)
      .filter((p) => texto(p.nome))
      .slice(0, 20)
      .map((p) => ({ nome: texto(p.nome)!, cargo: texto(p.cargo), email: texto(p.email), telefone: texto(p.telefone) })),
  };
}
