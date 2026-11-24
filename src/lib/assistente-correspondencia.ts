function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function radicalFlexao(palavra: string): string | null {
  const flexao = palavra.match(/^(.{5,}?)(?:ando|endo|indo|ados|adas|idos|idas|ado|ada|ido|ida|amos|aram|eram|iram|ar|er|ir|ou|ei|am|em|o|a)$/)
  return flexao?.[1] ?? null
}

function corresponde(palavra: string, termo: string): boolean {
  if (palavra === termo || (termo.length >= 4 && palavra.startsWith(termo))) return true
  const radicalTermo = radicalFlexao(termo)
  return radicalTermo !== null && radicalTermo === radicalFlexao(palavra)
}

export function acertosTermos(texto: string, termos: string[]): number {
  const palavras = normalizar(texto).match(/[a-z0-9]+/g) ?? []
  return termos.filter((termo) => palavras.some((palavra) => corresponde(palavra, termo))).length
}
