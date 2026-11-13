import type { Database, Json } from "@/lib/supabase/database.types";

export type ChaveFunil = "hospital" | "medico";
type TipoOrganizacao = Database["public"]["Enums"]["organization_type"];

// Funil sugerido pelo tipo da organização (decisão #7: clínicas no funil de hospitais).
export function funilPorTipo(tipo: TipoOrganizacao | null | undefined): ChaveFunil {
  return tipo === "hospital" || tipo === "clinica" ? "hospital" : "medico";
}

// Taxa padrão por funil. "Fundo e parcerias" não tem taxa padrão (a chave não existe em settings).
export function chaveTaxaPadrao(funil: string): string {
  return `default_rate_${funil}`;
}

export function valorDaConfiguracao(valor: Json | null | undefined): number | null {
  const v = (valor as { value?: unknown } | null)?.value;
  return typeof v === "number" ? v : null;
}

// "1.234.567,89", "1234,5", "250.000", "1234.56" ou "R$ 1.000" → centavos. Vazio → null. Inválido → NaN.
// Sem vírgula, pontos em grupos de 3 são milhar ("250.000" = 250 mil); um ponto com 1-2 casas é decimal.
export function lerReaisEmCentavos(texto: string): number | null {
  const t = texto.replace(/R\$|\s/g, "");
  if (!t) return null;
  const normalizado = t.includes(",")
    ? t.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(t)
      ? t.replace(/\./g, "")
      : t;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return Number.NaN;
  return Math.round(Number(normalizado) * 100);
}

export function lerTaxa(texto: string): number | null {
  const t = texto.replace("%", "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

const reais = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const reaisCompacto = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export function formatarReais(centavos: number | null): string {
  if (centavos === null) return "";
  return reais.format(centavos / 100);
}

// Para cartões: "1,2 mi", "350 mil".
export function formatarReaisCompacto(centavos: number | null): string {
  if (centavos === null) return "";
  return reaisCompacto.format(centavos / 100);
}

export function formatarTaxa(taxa: number | null): string {
  if (taxa === null) return "";
  return `${taxa.toLocaleString("pt-BR", { maximumFractionDigits: 3 })}% a.m.`;
}

export function formatarDataCurta(iso: string | null): string {
  if (!iso) return "";
  const [a, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(a, m - 1, d)))
    .replace(".", "");
}
