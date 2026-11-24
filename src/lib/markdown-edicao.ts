export type AcaoMarkdown = 'negrito' | 'italico' | 'lista' | 'link'

export function aplicarMarcacao(valor: string, inicio: number, fim: number, acao: AcaoMarkdown): { valor: string; inicio: number; fim: number } {
  const antes = valor.slice(0, inicio)
  const selecao = valor.slice(inicio, fim)
  const depois = valor.slice(fim)

  if (acao === 'lista') {
    const inicioLinha = valor.lastIndexOf('\n', Math.max(0, inicio - 1)) + 1
    const fimLinhaEncontrado = valor.indexOf('\n', fim)
    const fimLinha = fimLinhaEncontrado === -1 ? valor.length : fimLinhaEncontrado
    const trecho = valor.slice(inicioLinha, fimLinha)
    const linhas = trecho.split('\n')
    const remover = linhas.every((linha) => /^- /.test(linha))
    const alterado = linhas.map((linha) => remover ? linha.replace(/^- /, '') : `- ${linha}`).join('\n')
    return {
      valor: valor.slice(0, inicioLinha) + alterado + valor.slice(fimLinha),
      inicio: inicioLinha,
      fim: inicioLinha + alterado.length,
    }
  }

  if (acao === 'link') {
    const rotulo = selecao || 'texto do link'
    const inserido = `[${rotulo}](https://)`
    const inicioUrl = antes.length + rotulo.length + 3
    return { valor: antes + inserido + depois, inicio: inicioUrl, fim: inicioUrl + 8 }
  }

  const marca = acao === 'negrito' ? '**' : '*'
  const miolo = selecao || 'texto'
  const inserido = `${marca}${miolo}${marca}`
  const selecaoInicio = antes.length + marca.length
  return { valor: antes + inserido + depois, inicio: selecaoInicio, fim: selecaoInicio + miolo.length }
}
