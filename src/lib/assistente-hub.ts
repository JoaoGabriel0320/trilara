import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { chaveValida, streamArquivo, tamanhoArquivo, TAMANHO_MAXIMO_BYTES } from '@/lib/storage'
import { sistemasMencionados } from '@/lib/assistente-escopo'
import { markdownParaTextoPlano } from '@/lib/markdown'
import { conteudoDoPasso, trechosDoGuia } from '@/lib/passos-documento'
import { acertosTermos } from '@/lib/assistente-correspondencia'
import type { System } from '@/types'

export type FonteAssistente = {
  id: string
  titulo: string
  sistema: string
  tipo: 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF' | 'SISTEMA'
  href: string
  trecho: string | null
}

export type RespostaAssistente = {
  resposta: string
  fontes: FonteAssistente[]
  aviso?: string
  respostaDireta?: boolean
}

const SEM_RESPOSTA = 'Não encontrei uma resposta segura nos documentos publicados. Tente usar o nome do sistema, módulo ou procedimento na pergunta.'
const TERMOS_COMUNS = new Set([
  'como', 'para', 'por', 'que', 'qual', 'quais', 'onde', 'quando', 'quem', 'isso', 'esse', 'essa',
  'faco', 'fazer', 'posso', 'pode', 'preciso', 'conseguir', 'sistema', 'sistemas', 'modulo', 'documento',
  'manual', 'sobre', 'fala', 'falam', 'trata', 'tratam', 'aborda', 'abordam', 'meu', 'minha', 'nos', 'nas', 'dos', 'das', 'com', 'sem', 'uma', 'uns',
  'umas', 'tem', 'ter', 'estou', 'esta', 'esse', 'aqui', 'voce', 'pelo', 'pela', 'conte',
])

function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function perguntaPeloCatalogo(pergunta: string): boolean {
  const texto = normalizar(pergunta).replace(/[^a-z0-9]+/g, ' ').trim()
  const semContexto = texto
    .replace(/\b(?:na|no|da|do|de|em) trilara\b/g, ' ')
    .replace(/\ba trilara\b/g, ' ')
    .replace(/\b(?:hoje|atualmente|agora)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const complemento = '(?:a trilara tem|temos|existem|estao (?:disponiveis|cadastrados)|da trilara|disponiveis|cadastrados)'
  return new RegExp(`^(?:quais|que)(?: sao)?(?: os)? sistemas(?: ${complemento})?$`).test(texto)
    || new RegExp(`^(?:me )?(?:liste|mostre|apresente) (?:os )?sistemas(?: ${complemento})?$`).test(texto)
    || /^(?:(?:quais|que)(?: sao)?(?: os)?|(?:me )?(?:liste|mostre|apresente)(?: os)?) sistemas(?: (?:que )?(?:tem|possui|existem|ha|temos|ativos|cadastrados|disponiveis|estao (?:ativos|cadastrados|disponiveis)))*$/.test(semContexto)
    || /^(?:(?:quantos|quantas)|qual (?:e )?(?:a quantidade|o numero) de|numero de) sistemas(?: (?:que )?(?:tem|possui|existem|ha|temos|ativos|cadastrados|disponiveis|estao (?:ativos|cadastrados|disponiveis)))*$/.test(semContexto)
}

function perguntaPeloSistemaDoAssunto(pergunta: string): boolean {
  const texto = normalizar(pergunta).replace(/[^a-z0-9]+/g, ' ').trim()
  return /^(?:(?:em )?qual sistema|quais sistemas) (?:fala(?:m)? (?:sobre|de)|trata(?:m)? (?:de|sobre)|aborda(?:m)?|tem)\b/.test(texto)
}

function perguntaSobreAssunto(pergunta: string): boolean {
  const texto = normalizar(pergunta).replace(/[^a-z0-9]+/g, ' ').trim()
  return /^(?:e )?sobre [a-z0-9]/.test(texto) || perguntaPeloSistemaDoAssunto(pergunta)
}

function sistemasRelacionados(termos: string[], sistemas: System[]): System[] {
  const pontuados = sistemas.map((sistema) => {
    const nome = `${sistema.name} ${sistema.slug}`
    const categorias = sistema.tags.join(' ')
    const resumo = sistema.description
    const abrangencia = termos.filter((termo) =>
      acertos(nome, [termo]) || acertos(categorias, [termo]) || acertos(resumo, [termo])
    ).length
    const pontuacao = acertos(nome, termos) * 8 + acertos(categorias, termos) * 5 + acertos(resumo, termos) * 2
    return { sistema, abrangencia, pontuacao }
  }).filter((item) => item.pontuacao > 0 && item.abrangencia >= Math.min(2, termos.length))
    .sort((a, b) => b.pontuacao - a.pontuacao)

  if (!pontuados.length) return []
  return pontuados.filter((item) => item.pontuacao * 2 >= pontuados[0].pontuacao).map((item) => item.sistema)
}

function fonteDoSistema(sistema: System): FonteAssistente {
  return {
    id: `sistema-${sistema.slug}`,
    titulo: `Conheça o ${sistema.name}`,
    sistema: sistema.name,
    tipo: 'SISTEMA',
    href: `/documentacao/${encodeURIComponent(sistema.slug)}`,
    trecho: sistema.description || null,
  }
}

export function termosDaPergunta(pergunta: string): string[] {
  return [...new Set((normalizar(pergunta).match(/[a-z0-9]{3,}/g) ?? [])
    .filter((termo) => !TERMOS_COMUNS.has(termo)))]
}

function trechosDe(texto: string): string[] {
  const trechos: string[] = []
  for (let inicio = 0; inicio < texto.length && trechos.length < 120; inicio += 430) {
    trechos.push(texto.slice(inicio, inicio + 520).trim())
  }
  return trechos
}

function acertos(texto: string, termos: string[]): number {
  return acertosTermos(texto, termos)
}

function recorteRelevante(texto: string, termos: string[]): string {
  const textoNormalizado = normalizar(texto)
  const primeiraOcorrencia = termos
    .map((termo) => textoNormalizado.indexOf(termo))
    .filter((posicao) => posicao >= 0)
    .sort((a, b) => a - b)[0] ?? 0
  const inicio = Math.max(0, primeiraOcorrencia - 90)
  const fim = Math.min(texto.length, inicio + 360)
  return `${inicio ? '…' : ''}${texto.slice(inicio, fim).trim()}${fim < texto.length ? '…' : ''}`
}

const cachePdf = new Map<string, Promise<string>>()

async function textoDoPdf(chave: string, atualizadoEm: Date): Promise<string> {
  if (!chaveValida(chave) || !chave.endsWith('.pdf')) return ''
  const cacheKey = `${chave}:${atualizadoEm.getTime()}`
  const existente = cachePdf.get(cacheKey)
  if (existente) return existente

  const tarefa = (async () => {
    const tamanho = await tamanhoArquivo(chave)
    if (tamanho > TAMANHO_MAXIMO_BYTES) return ''
    const partes: Buffer[] = []
    let recebido = 0
    for await (const parte of await streamArquivo(chave)) {
      const bytes = Buffer.isBuffer(parte) ? parte : Buffer.from(parte)
      recebido += bytes.length
      if (recebido > TAMANHO_MAXIMO_BYTES) return ''
      partes.push(bytes)
    }
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const tarefaPdf = getDocument({ data: new Uint8Array(Buffer.concat(partes)), useSystemFonts: true })
    try {
      const pdf = await tarefaPdf.promise
      const paginas: string[] = []
      let caracteres = 0
      for (let numero = 1; numero <= Math.min(pdf.numPages, 30) && caracteres < 60_000; numero++) {
        const pagina = await pdf.getPage(numero)
        const conteudo = await pagina.getTextContent()
        const texto = conteudo.items.map((item) => 'str' in item ? item.str : '').join(' ')
        paginas.push(texto)
        caracteres += texto.length
        pagina.cleanup()
      }
      return paginas.join(' ').slice(0, 60_000).replace(/\s+/g, ' ').trim()
    } finally {
      await tarefaPdf.destroy()
    }
  })().catch((erro) => {
    cachePdf.delete(cacheKey)
    console.error('[assistente] Não foi possível ler um PDF:', erro)
    return ''
  })

  if (cachePdf.size >= 40) cachePdf.delete(cachePdf.keys().next().value!)
  cachePdf.set(cacheKey, tarefa)
  return tarefa
}

export async function responderComDocumentos(pergunta: string, sistemaFiltro = ''): Promise<RespostaAssistente> {
  const sistemas = await listarSistemas()
  const sistemasAtivos = new Map(sistemas.map((sistema) => [sistema.slug, sistema.name]))
  if (sistemaFiltro && !sistemasAtivos.has(sistemaFiltro)) return { resposta: 'Sistema não encontrado.', fontes: [] }

  if (perguntaPeloCatalogo(pergunta)) {
    const catalogo = sistemaFiltro ? sistemas.filter((sistema) => sistema.slug === sistemaFiltro) : sistemas
    return {
      resposta: sistemaFiltro
        ? `Você selecionou ${catalogo[0].name}. Para consultar a lista completa, escolha “Todos os sistemas” no início do chat.`
        : catalogo.length
          ? `A equipe tem ${catalogo.length} ${catalogo.length === 1 ? 'sistema ativo cadastrado' : 'sistemas ativos cadastrados'}: ${catalogo.map((sistema) => sistema.name).join(', ')}.`
          : 'Ainda não há sistemas disponíveis no catálogo.',
      fontes: catalogo.map((sistema) => ({
        id: `sistema-${sistema.slug}`,
        titulo: sistema.name,
        sistema: sistema.name,
        tipo: 'SISTEMA' as const,
        href: `/documentacao/${encodeURIComponent(sistema.slug)}`,
        trecho: sistema.description || null,
      })),
    }
  }

  const termos = termosDaPergunta(pergunta)
  if (!termos.length) return { resposta: 'Inclua o nome do procedimento ou assunto para eu procurar nos manuais.', fontes: [] }

  const mencionados = sistemasMencionados(pergunta, sistemas)
  if (mencionados.length > 1) {
    return { resposta: `Você mencionou mais de um sistema (${mencionados.map((item) => item.name).join(', ')}). Escolha um sistema por vez e faça a pergunta novamente.`, fontes: [] }
  }
  if (sistemaFiltro && mencionados.length === 1 && mencionados[0].slug !== sistemaFiltro) {
    return { resposta: `Você selecionou ${sistemasAtivos.get(sistemaFiltro)}, mas perguntou sobre ${mencionados[0].name}. Troque o sistema selecionado para consultar os manuais corretos.`, fontes: [] }
  }
  const sistemaDaBusca = sistemaFiltro || mencionados[0]?.slug || ''

  const escopoCadastro = !sistemaFiltro && mencionados.length === 1
    ? sistemas.filter((sistema) => sistema.slug === mencionados[0].slug)
    : sistemas
  const relacionados = sistemasRelacionados(termos, escopoCadastro)
  if (perguntaSobreAssunto(pergunta) && relacionados.length === 1) {
    const relacionado = relacionados[0]
    if (sistemaFiltro && relacionado.slug !== sistemaFiltro) {
      return {
        resposta: `Pelo cadastro, esse assunto está relacionado ao ${relacionado.name}. Você selecionou ${sistemasAtivos.get(sistemaFiltro)}; troque o sistema para consultar os materiais corretos.`,
        fontes: [],
      }
    }
    return {
      resposta: `O sistema relacionado a esse assunto é ${relacionado.name}. ${relacionado.description}`,
      fontes: [fonteDoSistema(relacionado)],
    }
  }

  const sistemaPerguntado = sistemas.find((sistema) =>
    (!sistemaDaBusca || sistema.slug === sistemaDaBusca)
    && termos.every((termo) => normalizar(`${sistema.name} ${sistema.slug}`).includes(termo))
    && termos.some((termo) => normalizar(`${sistema.name} ${sistema.slug}`).includes(termo))
  )
  const documentos = await prisma.documento.findMany({
    where: { ativo: true, publico: 'INTERNO', sistemaSlug: sistemaDaBusca ? sistemaDaBusca : { in: [...sistemasAtivos.keys()] } },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      palavrasChave: true,
      conteudo: true,
      tipo: true,
      slug: true,
      sistemaSlug: true,
      arquivoKey: true,
      atualizadoEm: true,
      categoria: { select: { nome: true } },
      passos: { orderBy: { ordem: 'asc' }, select: { titulo: true, texto: true, caminhoAcesso: true, destaqueTipo: true, destaqueTexto: true } },
    },
    orderBy: { atualizadoEm: 'desc' },
    take: 100,
  })

  // A leitura de PDF envolve storage e extração de texto. Processar poucos em
  // paralelo reduz a espera sem abrir até 20 arquivos ao mesmo tempo.
  const textosPdf = new Map<string, string>()
  const pdfsParaLer = documentos.filter((doc) => doc.tipo === 'PDF' && doc.arquivoKey).slice(0, 20)
  for (let inicio = 0; inicio < pdfsParaLer.length; inicio += 3) {
    await Promise.all(pdfsParaLer.slice(inicio, inicio + 3).map(async (doc) => {
      textosPdf.set(doc.id, await textoDoPdf(doc.arquivoKey!, doc.atualizadoEm))
    }))
  }

  type Candidato = {
    doc: (typeof documentos)[number]
    melhor: { texto: string; busca: string; passo: { numero: number; titulo: string } | null }
    pontuacao: number
    abrangencia: number
    trechoRelevante: boolean
  }
  function fonteDoCandidato(candidato: Candidato, nomeSistema: string): FonteAssistente {
    const base = `/documentacao/${encodeURIComponent(candidato.doc.sistemaSlug)}/${encodeURIComponent(candidato.doc.slug)}`
    const passo = candidato.trechoRelevante ? candidato.melhor.passo : null
    const recorte = candidato.trechoRelevante && candidato.melhor.texto ? recorteRelevante(candidato.melhor.texto, termos) : ''
    const passosDoGuia = candidato.doc.tipo === 'PASSO_A_PASSO'
      ? candidato.doc.passos.map((item, indice) => `Passo ${indice + 1} · ${item.titulo}: ${conteudoDoPasso(item)}`).join('\n')
      : ''
    const guiaCompleto = passosDoGuia.length > 0 && passosDoGuia.length <= 1800
    const contextoSistema = candidato.doc.categoria?.nome
      ? `${nomeSistema} · ${candidato.doc.categoria.nome}`
      : nomeSistema
    return {
      id: candidato.doc.id,
      titulo: candidato.doc.titulo,
      sistema: contextoSistema,
      tipo: candidato.doc.tipo,
      href: passo ? `${base}#passo-${passo.numero}` : base,
      trecho: guiaCompleto
        ? passosDoGuia
        : passo
        ? `Passo ${passo.numero} · ${passo.titulo}${recorte ? `: ${recorte}` : ''}`
        : candidato.trechoRelevante
          ? recorte
          : candidato.doc.descricao?.slice(0, 420) ?? null,
    }
  }
  const candidatos: Candidato[] = []
  for (const doc of documentos) {
    let opcoes: Candidato['melhor'][]
    if (doc.tipo === 'PASSO_A_PASSO') {
      opcoes = trechosDoGuia(doc.passos).map((trecho) => ({ ...trecho }))
    } else {
      const texto = doc.tipo === 'ARTIGO'
        ? markdownParaTextoPlano(doc.conteudo ?? '')
        : doc.tipo === 'PDF'
          ? textosPdf.get(doc.id) ?? ''
          : ''
      opcoes = trechosDe(texto).map((trecho) => ({ texto: trecho, busca: trecho, passo: null }))
    }
    const melhor = opcoes.reduce<Candidato['melhor'] | null>((escolhido, opcao) =>
      !escolhido || acertos(opcao.busca, termos) > acertos(escolhido.busca, termos) ? opcao : escolhido, null
    ) ?? { texto: '', busca: '', passo: null }
    const pontuacao = acertos(doc.titulo, termos) * 8
      + acertos(doc.palavrasChave ?? '', termos) * 7
      + acertos(doc.categoria?.nome ?? '', termos) * 6
      + acertos(doc.descricao ?? '', termos) * 4
      + acertos(melhor.busca, termos) * 2
    const abrangencia = acertos([doc.titulo, doc.palavrasChave, doc.categoria?.nome, doc.descricao, melhor.busca].filter(Boolean).join(' '), termos)
    candidatos.push({ doc, melhor, pontuacao, abrangencia, trechoRelevante: acertos(melhor.busca, termos) > 0 })
  }

  const relevantes = candidatos
    .filter((item) => item.pontuacao > 0 && item.abrangencia >= Math.min(2, termos.length))
    .sort((a, b) => b.abrangencia - a.abrangencia || b.pontuacao - a.pontuacao)

  if (!sistemaDaBusca) {
    const slugsEncontrados = [...new Set(relevantes.map((item) => item.doc.sistemaSlug))]
    if (slugsEncontrados.length > 1) {
      const nomes = slugsEncontrados.slice(0, 5).map((slug) => sistemasAtivos.get(slug) ?? slug)
      return { resposta: `Encontrei materiais relacionados em mais de um sistema: ${nomes.join(', ')}. Selecione um sistema e repita a pergunta para evitar misturar procedimentos.`, fontes: [] }
    }
  }

  const encontrados = relevantes.slice(0, 3)

  if (perguntaPeloSistemaDoAssunto(pergunta) && encontrados.length) {
    const nome = sistemasAtivos.get(encontrados[0].doc.sistemaSlug)!
    return {
      resposta: sistemaFiltro
        ? `No ${nome}, encontrei material publicado sobre esse assunto: “${encontrados[0].doc.titulo}”.`
        : `O sistema com material publicado sobre esse assunto é ${nome}. Encontrei “${encontrados[0].doc.titulo}”.`,
      fontes: encontrados.map((candidato) => fonteDoCandidato(candidato, sistemasAtivos.get(candidato.doc.sistemaSlug) ?? candidato.doc.sistemaSlug)),
      respostaDireta: true,
    }
  }

  if (!encontrados.some((item) => item.trechoRelevante) && sistemaPerguntado?.description) {
    return {
      resposta: `Sobre o ${sistemaPerguntado.name}: ${sistemaPerguntado.description}`,
      fontes: [{
        id: `sistema-${sistemaPerguntado.slug}`,
        titulo: `Conheça o ${sistemaPerguntado.name}`,
        sistema: sistemaPerguntado.name,
        tipo: 'SISTEMA',
        href: `/documentacao/${encodeURIComponent(sistemaPerguntado.slug)}`,
        trecho: sistemaPerguntado.description,
      }],
    }
  }

  if (!encontrados.length) {
    if (!sistemaFiltro && relacionados.length > 1) {
      return {
        resposta: `Encontrei esse assunto no cadastro de mais de um sistema: ${relacionados.map((sistema) => sistema.name).join(', ')}. Selecione um sistema para continuar.`,
        fontes: relacionados.map(fonteDoSistema),
      }
    }
    if (relacionados.length === 1 && (!sistemaDaBusca || relacionados[0].slug === sistemaDaBusca)) {
      const relacionado = relacionados[0]
      return {
        resposta: `${relacionado.name} está relacionado a esse assunto: ${relacionado.description} Não encontrei um procedimento publicado para dar mais detalhes.`,
        fontes: [fonteDoSistema(relacionado)],
      }
    }
    return { resposta: SEM_RESPOSTA, fontes: [] }
  }

  const fontes: FonteAssistente[] = encontrados.map((candidato) =>
    fonteDoCandidato(candidato, sistemasAtivos.get(candidato.doc.sistemaSlug) ?? candidato.doc.sistemaSlug)
  )

  const principal = encontrados.find((item) => item.trechoRelevante)
  const recortePrincipal = principal?.melhor.texto ? recorteRelevante(principal.melhor.texto, termos) : ''
  const passoPrincipal = principal?.melhor.passo
  const fontePrincipal = principal ? fontes[encontrados.indexOf(principal)] : null
  const guiaCompleto = principal?.doc.tipo === 'PASSO_A_PASSO' && fontePrincipal?.trecho?.startsWith('Passo 1 ·')
  return {
    resposta: principal
      ? guiaCompleto
        ? `No guia “${principal.doc.titulo}”, encontrei este procedimento:\n${fontePrincipal?.trecho}\nConfira a fonte abaixo antes de executar.`
        : passoPrincipal
        ? recortePrincipal
          ? `No guia “${principal.doc.titulo}”, passo ${passoPrincipal.numero} (${passoPrincipal.titulo}), encontrei este trecho: “${recortePrincipal}”. Confira a fonte abaixo para ver o passo completo.`
          : `No guia “${principal.doc.titulo}”, o passo ${passoPrincipal.numero} (${passoPrincipal.titulo}) trata desse assunto. Confira a fonte abaixo para ver o passo completo.`
        : `No material “${principal.doc.titulo}”, encontrei este trecho: “${recortePrincipal}”. Confira a fonte abaixo para ver o contexto completo.`
      : `Encontrei ${fontes.length === 1 ? 'um material relacionado' : 'materiais relacionados'} pelo título, descrição ou palavras-chave, mas ainda não tenho texto suficiente para responder com segurança.`,
    fontes,
    ...(!principal ? { aviso: 'PDFs digitalizados como imagem e links externos não têm texto pesquisável neste piloto.' } : {}),
  }
}
