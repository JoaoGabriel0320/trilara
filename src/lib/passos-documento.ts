import { markdownParaTextoPlano } from '@/lib/markdown'

export const MAX_PASSOS_DOCUMENTO = 40
export const LIMITE_TITULO_PASSO = 200
export const LIMITE_TEXTO_PASSO = 10_000
export const LIMITE_DESTAQUE_PASSO = 1_000
export const LIMITE_CAMINHO_ACESSO = 300
export const LIMITE_JSON_PASSOS = 1_000_000
export const LIMITE_ENVIO_PRINTS_BYTES = 64 * 1024 * 1024
export const LIMITE_TEXTO_BUSCA_PASSOS = 4_000
export const TAMANHO_JANELA_TRECHO = 520
export const AVANCO_JANELA_TRECHO = 430
export const MAX_TRECHOS_GUIA = 120

export const TIPOS_DESTAQUE = ['REGRA', 'ATENCAO', 'DICA'] as const
export type TipoDestaque = (typeof TIPOS_DESTAQUE)[number]
export const ROTULO_DESTAQUE: Record<TipoDestaque, string> = {
  REGRA: 'Regra',
  ATENCAO: 'Atenção',
  DICA: 'Dica',
}
export const ROTULO_FORMATO = {
  PDF: 'PDF',
  ARTIGO: 'Página',
  LINK: 'Link externo',
  GIF: 'GIF',
  PASSO_A_PASSO: 'Passo a passo',
} as const

export class PassosInvalidosError extends Error {}

export type PassoValidado = {
  ordem: number
  titulo: string
  texto: string | null
  destaqueTipo: TipoDestaque | null
  destaqueTexto: string | null
  caminhoAcesso: string | null
  print: { existente: string } | { novo: number } | null
  printAcesso: { existente: string } | { novo: number } | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROLES = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g

function objeto(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor)
}

function limparTitulo(valor: string): string {
  return valor.replace(CONTROLES, '').replace(/[\r\n]+/g, ' ').trim()
}

function limparTexto(valor: string): string {
  return valor.replace(/\r\n?/g, '\n').replace(CONTROLES, '').trim()
}

export function interpretarPassos(
  bruto: unknown,
  opcoes: { imagensDoDocumento: ReadonlySet<string>; quantidadePrintsNovos: number },
): PassoValidado[] {
  if (typeof bruto !== 'string' || bruto.length > LIMITE_JSON_PASSOS) {
    throw new PassosInvalidosError('Lista de passos inválida.')
  }

  let lista: unknown
  try {
    lista = JSON.parse(bruto)
  } catch {
    throw new PassosInvalidosError('Lista de passos inválida.')
  }
  if (!Array.isArray(lista)) throw new PassosInvalidosError('Lista de passos inválida.')
  if (lista.length === 0) throw new PassosInvalidosError('Adicione pelo menos um passo.')
  if (lista.length > MAX_PASSOS_DOCUMENTO) throw new PassosInvalidosError('Um guia pode ter no máximo 40 passos.')

  const imagensUsadas = new Set<string>()
  const novosUsados = new Set<number>()
  const resultado = lista.map((item, indice): PassoValidado => {
    const numero = indice + 1
    if (!objeto(item)) throw new PassosInvalidosError('Lista de passos inválida.')

    const titulo = typeof item.titulo === 'string' ? limparTitulo(item.titulo) : ''
    if (!titulo) throw new PassosInvalidosError(`Informe o título do passo ${numero}.`)
    if (titulo.length > LIMITE_TITULO_PASSO) throw new PassosInvalidosError(`O título do passo ${numero} pode ter no máximo 200 caracteres.`)

    let texto: string | null = null
    if (item.texto !== undefined && item.texto !== null && item.texto !== '') {
      if (typeof item.texto !== 'string') throw new PassosInvalidosError('Lista de passos inválida.')
      texto = limparTexto(item.texto) || null
      if (texto && texto.length > LIMITE_TEXTO_PASSO) throw new PassosInvalidosError(`O texto do passo ${numero} pode ter no máximo 10.000 caracteres.`)
    }

    let destaqueTipo: TipoDestaque | null = null
    let destaqueTexto: string | null = null
    if (item.destaque !== undefined && item.destaque !== null) {
      if (!objeto(item.destaque) || typeof item.destaque.tipo !== 'string' || !TIPOS_DESTAQUE.includes(item.destaque.tipo as TipoDestaque)) {
        throw new PassosInvalidosError(`Tipo de destaque inválido no passo ${numero}.`)
      }
      destaqueTipo = item.destaque.tipo as TipoDestaque
      destaqueTexto = typeof item.destaque.texto === 'string' ? limparTexto(item.destaque.texto) : ''
      if (!destaqueTexto) throw new PassosInvalidosError(`Escreva o texto do destaque do passo ${numero}.`)
      if (destaqueTexto.length > LIMITE_DESTAQUE_PASSO) throw new PassosInvalidosError(`O destaque do passo ${numero} pode ter no máximo 1.000 caracteres.`)
    }

    let caminhoAcesso: string | null = null
    if (item.caminhoAcesso !== undefined && item.caminhoAcesso !== null && item.caminhoAcesso !== '') {
      if (typeof item.caminhoAcesso !== 'string') throw new PassosInvalidosError('Lista de passos inválida.')
      caminhoAcesso = limparTitulo(item.caminhoAcesso) || null
      if (caminhoAcesso && caminhoAcesso.length > LIMITE_CAMINHO_ACESSO) throw new PassosInvalidosError(`O caminho de acesso do passo ${numero} pode ter no máximo 300 caracteres.`)
    }

    function validarPrint(valor: unknown, rotulo: string): PassoValidado['print'] {
      if (valor === undefined || valor === null) return null
      if (!objeto(valor)) throw new PassosInvalidosError('Lista de passos inválida.')
      const chaves = Object.keys(valor)
      if (chaves.length !== 1) throw new PassosInvalidosError('Lista de passos inválida.')
      if ('imagemId' in valor) {
        const imagemId = valor.imagemId
        if (typeof imagemId !== 'string' || !UUID.test(imagemId) || !opcoes.imagensDoDocumento.has(imagemId)) {
          throw new PassosInvalidosError(`O ${rotulo} do passo ${numero} não pertence a este documento.`)
        }
        if (imagensUsadas.has(imagemId)) throw new PassosInvalidosError('O mesmo print foi usado em mais de um passo.')
        imagensUsadas.add(imagemId)
        return { existente: imagemId }
      } else if ('novo' in valor) {
        const novo = valor.novo
        if (!Number.isInteger(novo) || (novo as number) < 0 || (novo as number) >= opcoes.quantidadePrintsNovos) {
          throw new PassosInvalidosError(`O ${rotulo} do passo ${numero} não foi enviado.`)
        }
        if (novosUsados.has(novo as number)) throw new PassosInvalidosError('O mesmo print foi usado em mais de um passo.')
        novosUsados.add(novo as number)
        return { novo: novo as number }
      } else {
        throw new PassosInvalidosError('Lista de passos inválida.')
      }
    }

    const print = validarPrint(item.print, 'print')
    const printAcesso = validarPrint(item.printAcesso, 'print de acesso')

    return { ordem: indice, titulo, texto, destaqueTipo, destaqueTexto, caminhoAcesso, print, printAcesso }
  })

  if (novosUsados.size !== opcoes.quantidadePrintsNovos) {
    throw new PassosInvalidosError('Há prints enviados sem passo correspondente.')
  }
  return resultado
}

export function mensagemLimiteEnvioPrints(totalBytes: number): string {
  const totalMb = Math.ceil(totalBytes / 1024 / 1024)
  return `Os prints novos somam ${totalMb} MB. Envie até 64 MB por vez: salve o guia e adicione os demais prints depois.`
}

export type PassoComTexto = {
  titulo: string
  texto: string | null
  caminhoAcesso?: string | null
  destaqueTipo: TipoDestaque | null
  destaqueTexto: string | null
}

export function conteudoDoPasso(passo: PassoComTexto): string {
  return [
    passo.caminhoAcesso ? `Caminho de acesso: ${passo.caminhoAcesso}` : '',
    markdownParaTextoPlano(passo.texto ?? ''),
    passo.destaqueTipo && passo.destaqueTexto ? `${ROTULO_DESTAQUE[passo.destaqueTipo]}: ${passo.destaqueTexto}` : '',
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function textoPesquisavelDosPassos(passos: PassoComTexto[], limite = LIMITE_TEXTO_BUSCA_PASSOS): string {
  return [
    passos.map((passo) => passo.titulo).join(' '),
    passos.map(conteudoDoPasso).join(' '),
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0, limite)
}

export type TrechoGuia = {
  texto: string
  busca: string
  passo: { numero: number; titulo: string }
}

export function trechosDoGuia(passos: PassoComTexto[]): TrechoGuia[] {
  const porPasso = passos.map((passo, indice) => {
    const conteudo = conteudoDoPasso(passo)
    const janelas: string[] = []
    if (!conteudo) janelas.push('')
    else for (let inicio = 0; inicio < conteudo.length; inicio += AVANCO_JANELA_TRECHO) {
      janelas.push(conteudo.slice(inicio, inicio + TAMANHO_JANELA_TRECHO).trim())
    }
    return { passo, numero: indice + 1, janelas }
  })

  const selecionados: { indicePasso: number; indiceJanela: number; trecho: TrechoGuia }[] = []
  for (let rodada = 0; selecionados.length < MAX_TRECHOS_GUIA; rodada++) {
    let adicionou = false
    for (let indicePasso = 0; indicePasso < porPasso.length && selecionados.length < MAX_TRECHOS_GUIA; indicePasso++) {
      const item = porPasso[indicePasso]
      const texto = item.janelas[rodada]
      if (texto === undefined) continue
      adicionou = true
      selecionados.push({
        indicePasso,
        indiceJanela: rodada,
        trecho: {
          texto,
          busca: `${item.passo.titulo}. ${texto}`.trim(),
          passo: { numero: item.numero, titulo: item.passo.titulo },
        },
      })
    }
    if (!adicionou) break
  }

  return selecionados
    .sort((a, b) => a.indicePasso - b.indicePasso || a.indiceJanela - b.indiceJanela)
    .map((item) => item.trecho)
}

export function estimarMinutosLeitura(passos: PassoComTexto[], quantidadePrints: number): number {
  const palavras = passos.reduce((total, passo) => {
    const texto = `${passo.titulo} ${conteudoDoPasso(passo)}`.trim()
    return total + (texto.match(/\S+/g)?.length ?? 0)
  }, 0)
  return Math.max(1, Math.round(palavras / 200 + quantidadePrints * 0.25))
}

export function complementoAuditoria(dados: {
  tipoAnterior: keyof typeof ROTULO_FORMATO | null
  tipoNovo: keyof typeof ROTULO_FORMATO
  totalPassos: number
  passosDescartados: number
  comeceAntes: boolean | null
  comeceDepois: boolean
}): string {
  const partes: string[] = []
  if (dados.tipoNovo === 'PASSO_A_PASSO') partes.push(`passo a passo, ${dados.totalPassos} ${dados.totalPassos === 1 ? 'passo' : 'passos'}`)
  if (dados.tipoAnterior && dados.tipoAnterior !== dados.tipoNovo) partes.push(`formato: ${ROTULO_FORMATO[dados.tipoAnterior]} → ${ROTULO_FORMATO[dados.tipoNovo]}`)
  if (dados.passosDescartados) partes.push(`${dados.passosDescartados} ${dados.passosDescartados === 1 ? 'passo descartado' : 'passos descartados'}`)
  if (dados.comeceAntes !== null && dados.comeceAntes !== dados.comeceDepois) {
    partes.push(dados.comeceDepois ? 'incluído em "Comece por aqui"' : 'removido de "Comece por aqui"')
  }
  return partes.length ? ` (${partes.join('; ')})` : ''
}
