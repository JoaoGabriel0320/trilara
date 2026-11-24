// As fontes aparecem separadamente no chat. Remove marcadores de linha gerados pelo modelo.
export function limparCitacoesDoAssistente(texto: string): string {
  return texto.replace(/ ?\u3010\d+\u2020L\d+(?:[-\u2013]L?\d+)?\u3011/g, '')
}
