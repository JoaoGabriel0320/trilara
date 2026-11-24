import type { PerfilEcossistema, System, SystemColor, SystemStatus, TipoVinculoSistema, VinculoSistema } from '@/types'
import { gerarSlug } from '@/lib/slug'
import { urlExternaValida } from '@/lib/url-externa'

const cores: SystemColor[] = ['brand', 'blue', 'green', 'amber', 'teal', 'rose']
const estados: SystemStatus[] = ['ONLINE', 'MAINTENANCE', 'OFFLINE']
const tiposVinculo: TipoVinculoSistema[] = ['INTEGRACAO', 'DEPENDENCIA', 'PROCESSO']

export function validarPerfilEcossistema(corpo: unknown, slugOrigem: string, slugsAtivos: readonly string[]): { ecossistema?: PerfilEcossistema; erro?: string } {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { erro: 'Dados do ecossistema inválidos.' }
  const dados = corpo as Record<string, unknown>
  const lerTexto = (chave: string, maximo: number): string | null => {
    const valor = dados[chave]
    return typeof valor === 'string' && valor.trim().length <= maximo ? valor.trim() : null
  }
  const area = lerTexto('area', 100)
  const quemUsa = lerTexto('quemUsa', 300)
  const responsavel = lerTexto('responsavel', 120)
  if (area === null || quemUsa === null || responsavel === null) {
    return { erro: 'Informe área, quem usa e responsável em texto, com até 100, 300 e 120 caracteres, respectivamente.' }
  }
  if (!Array.isArray(dados.funcionalidades) || dados.funcionalidades.length > 20
    || dados.funcionalidades.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 160)) {
    return { erro: 'Informe até 20 funcionalidades de até 160 caracteres cada.' }
  }
  if (!Array.isArray(dados.vinculos) || dados.vinculos.length > 30) {
    return { erro: 'Informe até 30 vínculos por sistema.' }
  }
  const destinosAtivos = new Set(slugsAtivos)
  const chavesVinculo = new Set<string>()
  const vinculos: VinculoSistema[] = []
  for (const item of dados.vinculos) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { erro: 'Vínculo de sistema inválido.' }
    const vinculo = item as Record<string, unknown>
    const destinoSlug = typeof vinculo.destinoSlug === 'string' ? vinculo.destinoSlug.trim() : ''
    const descricao = typeof vinculo.descricao === 'string' ? vinculo.descricao.trim() : ''
    if (!destinoSlug || destinoSlug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(destinoSlug)) {
      return { erro: 'Selecione um sistema de destino válido para cada vínculo.' }
    }
    if (destinoSlug === slugOrigem) return { erro: 'Um sistema não pode ter vínculo consigo mesmo.' }
    if (!destinosAtivos.has(destinoSlug)) return { erro: 'O destino de cada vínculo precisa ser um sistema ativo do catálogo.' }
    if (!tiposVinculo.includes(vinculo.tipo as TipoVinculoSistema) || !['IDA', 'AMBOS'].includes(vinculo.direcao as string)) {
      return { erro: 'Selecione tipo e direção válidos para cada vínculo.' }
    }
    if (!descricao || descricao.length > 500) return { erro: 'Descreva cada vínculo em até 500 caracteres.' }
    const chave = `${destinoSlug}:${vinculo.tipo}`
    if (chavesVinculo.has(chave)) return { erro: 'Já existe um vínculo desse tipo com o mesmo sistema de destino.' }
    chavesVinculo.add(chave)
    vinculos.push({ destinoSlug, tipo: vinculo.tipo as TipoVinculoSistema, descricao, direcao: vinculo.direcao as VinculoSistema['direcao'] })
  }
  return { ecossistema: {
    area,
    funcionalidades: dados.funcionalidades.map((item: string) => item.trim()),
    quemUsa,
    responsavel,
    vinculos,
  } }
}

export function validarSistema(corpo: unknown, slugFixo?: string, slugsAtivos: readonly string[] = []): { sistema?: System; erro?: string } {
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) return { erro: 'Dados inválidos.' }
  const dados = corpo as Record<string, unknown>
  const texto = (chave: string, maximo: number) => typeof dados[chave] === 'string' ? dados[chave].trim().slice(0, maximo + 1) : ''
  const name = texto('name', 100)
  const slug = slugFixo ?? gerarSlug(texto('slug', 80) || name)
  const description = texto('description', 500)
  const url = texto('url', 500)
  const logoUrl = texto('logoUrl', 300)
  const color = dados.color
  const status = dados.status
  const kind = dados.kind
  const tags = Array.isArray(dados.tags) ? dados.tags : []
  const metric = dados.metric && typeof dados.metric === 'object' && !Array.isArray(dados.metric)
    ? dados.metric as Record<string, unknown> : {}

  if (!name || name.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return { erro: 'Informe nome e identificador válidos (até 100 e 80 caracteres).' }
  }
  if (!description || description.length > 500) return { erro: 'Informe uma descrição de até 500 caracteres.' }
  if (url && !urlExternaValida(url, 500)) return { erro: 'Informe um link HTTP ou HTTPS válido.' }
  if (logoUrl && (!/^\/logos\/[a-zA-Z0-9._/-]+$/.test(logoUrl) || logoUrl.includes('..') || logoUrl.includes('//'))) {
    return { erro: 'Use um caminho de logo em /logos/.' }
  }
  if (!cores.includes(color as SystemColor) || !estados.includes(status as SystemStatus) || !['internal', 'external'].includes(kind as string)) {
    return { erro: 'Selecione origem, cor e situação válidas.' }
  }
  if (tags.length > 8 || tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 40)) {
    return { erro: 'Informe até oito categorias de até 40 caracteres.' }
  }
  const opcional = (chave: string, maximo: number) => {
    const valor = texto(chave, maximo)
    return valor.length <= maximo ? valor : null
  }
  const descriptionEn = opcional('descriptionEn', 500)
  const longDescription = opcional('longDescription', 2000)
  const longDescriptionEn = opcional('longDescriptionEn', 2000)
  if (descriptionEn === null || longDescription === null || longDescriptionEn === null) return { erro: 'Uma descrição excede o tamanho permitido.' }
  const perfil = Object.hasOwn(dados, 'ecossistema')
    ? validarPerfilEcossistema(dados.ecossistema, slug, slugsAtivos)
    : {}
  if (perfil.erro) return { erro: perfil.erro }

  return { sistema: {
    id: slug,
    slug,
    name,
    letter: name.charAt(0).toUpperCase(),
    kind: kind as System['kind'],
    description,
    descriptionEn: descriptionEn || undefined,
    longDescription: longDescription || undefined,
    longDescriptionEn: longDescriptionEn || undefined,
    url: url || undefined,
    logoUrl: logoUrl || undefined,
    status: status as SystemStatus,
    color: color as SystemColor,
    tags: tags.map((tag: string) => tag.trim()),
    metric: {
      value: typeof metric.value === 'string' ? metric.value.trim().slice(0, 40) : '',
      label: typeof metric.label === 'string' ? metric.label.trim().slice(0, 80) : '',
    },
    featured: dados.featured === true,
    ...(perfil.ecossistema ? { ecossistema: perfil.ecossistema } : {}),
  } }
}
