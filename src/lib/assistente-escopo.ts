type SistemaDoEscopo = { slug: string; name: string }

function palavras(valor: string): string[] {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) ?? []
}

/** Reconhece sistemas mencionados no catálogo atual. */
export function sistemasMencionados(pergunta: string, sistemas: SistemaDoEscopo[]): SistemaDoEscopo[] {
  const palavrasPergunta = palavras(pergunta)
  const frase = ` ${palavrasPergunta.join(' ')} `
  const termosPorSistema = sistemas.map((sistema) => new Set([
    ...palavras(sistema.name), ...palavras(sistema.slug),
  ].filter((termo) => termo.length >= 3)))
  const frequencia = new Map<string, number>()
  for (const termos of termosPorSistema) {
    for (const termo of termos) frequencia.set(termo, (frequencia.get(termo) ?? 0) + 1)
  }
  return sistemas.filter((sistema, indice) => {
    const nome = palavras(sistema.name).join(' ')
    const slug = palavras(sistema.slug).join(' ')
    return (nome && frase.includes(` ${nome} `))
      || (slug && frase.includes(` ${slug} `))
      || [...termosPorSistema[indice]].some((termo) => frequencia.get(termo) === 1 && palavrasPergunta.includes(termo))
  })
}
