// Validações e formatos usados nos formulários. Sem dependências: rodam no servidor e no navegador.

// CNPJ: desde jul/2026 a Receita Federal emite CNPJ alfanumérico (IN RFB 2.229/2024).
// Formato: 12 posições com A-Z ou 0-9 + 2 dígitos verificadores numéricos.
// Cálculo dos dígitos: valor de cada caractere = código ASCII − 48 (0-9 → 0-9, A → 17 ... Z → 42),
// pesos e módulo 11 iguais aos do CNPJ numérico. Vale também para os CNPJs antigos, só com números.
export function normalizarCnpj(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function cnpjValido(valor: string): boolean {
  const c = normalizarCnpj(valor);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(c)) return false;
  if (/^(.)\1{13}$/.test(c)) return false;

  const digito = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, peso, i) => acc + (base.charCodeAt(i) - 48) * peso, 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const d1 = digito(c.slice(0, 12));
  const d2 = digito(c.slice(0, 12) + d1);
  return c[12] === String(d1) && c[13] === String(d2);
}

export function formatarCnpj(valor: string | null): string {
  if (!valor) return "";
  const c = normalizarCnpj(valor);
  if (c.length !== 14) return valor;
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

// Texto de formulário: vazio vira null, para o banco guardar "sem valor" e não string vazia.
export function textoOuNulo(valor: FormDataEntryValue | null): string | null {
  const t = String(valor ?? "").trim();
  return t === "" ? null : t;
}
