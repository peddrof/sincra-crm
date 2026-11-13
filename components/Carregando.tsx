// Espera padrão das páginas internas. Cada página envolve o conteúdo que lê dados em <Suspense>
// com este fallback (exigência do cacheComponents para navegação instantânea).
export function Carregando() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <p className="text-sm text-cinza">Carregando…</p>
    </main>
  );
}
