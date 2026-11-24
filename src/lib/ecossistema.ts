import type { PerfilEcossistema, System, TipoVinculoSistema } from '@/types'

// Perfis iniciais descrevem apenas funções já presentes no catálogo do Hub.
// Integrações são cadastradas explicitamente pela administração.
const PERFIS: Record<string, Pick<PerfilEcossistema, 'area' | 'funcionalidades'>> = {
  'portal-de-clientes': { area: 'Atendimento', funcionalidades: ['Consulta de solicitações', 'Histórico de atualizações', 'Acesso a arquivos'] },
  'agenda-de-operacoes': { area: 'Operações', funcionalidades: ['Agendamento compartilhado', 'Acompanhamento de tarefas', 'Visão por período'] },
  'gestao-financeira': { area: 'Finanças', funcionalidades: ['Consulta de lançamentos', 'Relatórios de exemplo', 'Visão de indicadores'] },
  'controle-de-estoque': { area: 'Estoque', funcionalidades: ['Consulta de itens', 'Registro de entradas e saídas', 'Visão de disponibilidade'] },
  'painel-de-entregas': { area: 'Entregas', funcionalidades: ['Acompanhamento de etapas', 'Registro de ocorrências', 'Resumo de entregas'] },
}

export const TIPOS_VINCULO: Record<TipoVinculoSistema, { nome: string; cor: string; explicacao: string }> = {
  INTEGRACAO: { nome: 'Integração', cor: '#12aa99', explicacao: 'Troca de informações entre sistemas.' },
  DEPENDENCIA: { nome: 'Dependência', cor: '#d97706', explicacao: 'A origem depende do destino para executar uma função.' },
  PROCESSO: { nome: 'Mesmo processo', cor: '#0891b2', explicacao: 'Participam de um mesmo processo operacional.' },
}

export type SistemaEcossistema = System & { totalManuais: number }
export type ConexaoEcossistema = {
  id: string
  origemSlug: string
  destinoSlug: string
  tipo: TipoVinculoSistema
  descricao: string
  direcao: 'IDA' | 'AMBOS'
}

export function perfilDoSistema(sistema: System): PerfilEcossistema {
  const inicial = PERFIS[sistema.slug]
  return {
    area: sistema.ecossistema?.area || inicial?.area || sistema.tags[0] || 'Outros sistemas',
    funcionalidades: sistema.ecossistema ? sistema.ecossistema.funcionalidades : inicial?.funcionalidades ?? [],
    quemUsa: sistema.ecossistema?.quemUsa ?? '',
    responsavel: sistema.ecossistema?.responsavel ?? '',
    vinculos: sistema.ecossistema?.vinculos ?? [],
  }
}

/** Exclui destinos arquivados ou fora do catálogo visível e une vínculos recíprocos idênticos. */
export function conexoesDoEcossistema(sistemas: System[]): ConexaoEcossistema[] {
  const slugs = new Set(sistemas.map(s => s.slug))
  const vistos = new Set<string>()
  const conexoes: ConexaoEcossistema[] = []
  for (const sistema of sistemas) {
    for (const vinculo of perfilDoSistema(sistema).vinculos) {
      if (vinculo.destinoSlug === sistema.slug || !slugs.has(vinculo.destinoSlug)) continue
      const pontas = vinculo.direcao === 'AMBOS' ? [sistema.slug, vinculo.destinoSlug].sort() : [sistema.slug, vinculo.destinoSlug]
      const chave = JSON.stringify([...pontas, vinculo.tipo, vinculo.direcao, vinculo.descricao])
      if (vistos.has(chave)) continue
      vistos.add(chave)
      conexoes.push({ ...vinculo, origemSlug: sistema.slug, id: `${sistema.slug}:${vinculo.destinoSlug}:${vinculo.tipo}` })
    }
  }
  return conexoes
}

export function normalizarBuscaEcossistema(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
}

export function correspondeBuscaEcossistema(sistema: System, busca: string): boolean {
  const perfil = perfilDoSistema(sistema)
  const texto = normalizarBuscaEcossistema([sistema.name, sistema.description, sistema.longDescription, ...sistema.tags, perfil.area, ...perfil.funcionalidades, perfil.quemUsa, perfil.responsavel].join(' '))
  return normalizarBuscaEcossistema(busca).split(/\s+/).every(termo => texto.includes(termo))
}

export const LARGURA_NO = 244
export const ALTURA_NO = 116
export type PosicaoNo = { x: number; y: number }

export function organizarMapa(sistemas: System[]) {
  const porArea = new Map<string, System[]>()
  for (const sistema of sistemas) {
    const area = perfilDoSistema(sistema).area
    porArea.set(area, [...(porArea.get(area) ?? []), sistema])
  }
  const grupos = [...porArea.entries()].sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  const colunas = Math.min(3, Math.max(1, grupos.length))
  const posicoes = new Map<string, PosicaoNo>()
  const areas: { nome: string; x: number; y: number; altura: number }[] = []
  let y = 44
  for (let inicio = 0; inicio < grupos.length; inicio += colunas) {
    const linha = grupos.slice(inicio, inicio + colunas)
    const altura = Math.max(...linha.map(([, itens]) => itens.length)) * (ALTURA_NO + 20) + 64
    linha.forEach(([nome, itens], coluna) => {
      const x = 40 + coluna * 316
      areas.push({ nome, x, y, altura })
      itens.forEach((sistema, i) => posicoes.set(sistema.slug, { x: x + 16, y: y + 46 + i * (ALTURA_NO + 20) }))
    })
    y += altura + 48
  }
  return { posicoes, areas, largura: colunas * 316 + 48, altura: Math.max(300, y) }
}
