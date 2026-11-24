// Execute com: npx tsx scripts/testar-ecossistema.ts
import assert from 'node:assert/strict'
import type { PerfilEcossistema, System, VinculoSistema } from '../src/types'
import { validarPerfilEcossistema, validarSistema } from '../src/lib/sistema-cadastro'
import {
  ALTURA_NO,
  LARGURA_NO,
  conexoesDoEcossistema,
  correspondeBuscaEcossistema,
  organizarMapa,
  perfilDoSistema,
} from '../src/lib/ecossistema'

let checks = 0
function verificar(nome: string, executar: () => void) {
  executar()
  checks++
  console.log(`OK ${nome}`)
}

function perfil(alteracoes: Partial<PerfilEcossistema> = {}): PerfilEcossistema {
  return {
    area: 'Operação',
    funcionalidades: ['Conferência de notas fiscais', 'Acompanhamento de entregas'],
    quemUsa: 'Equipe de transporte',
    responsavel: 'Tecnologia',
    vinculos: [],
    ...alteracoes,
  }
}

function sistema(slug: string, ecossistema?: PerfilEcossistema): System {
  return {
    id: slug,
    slug,
    name: `Sistema ${slug}`,
    letter: 'S',
    kind: 'internal',
    description: 'Ferramenta de apoio às equipes.',
    color: 'brand',
    status: 'ONLINE',
    tags: ['Logística'],
    metric: { value: '', label: '' },
    ...(ecossistema ? { ecossistema } : {}),
  }
}

function vinculo(alteracoes: Partial<VinculoSistema> = {}): VinculoSistema {
  return {
    destinoSlug: 'beta',
    tipo: 'INTEGRACAO',
    descricao: 'Compartilha os agendamentos confirmados.',
    direcao: 'IDA',
    ...alteracoes,
  }
}

const slugsAtivos = ['alfa', 'beta', 'gama']
const validar = (dados: unknown) => validarPerfilEcossistema(dados, 'alfa', slugsAtivos)

verificar('perfil válido normaliza espaços sem alterar os dados recebidos', () => {
  const recebido = perfil({ area: ' Transporte ', funcionalidades: [' Consultar viagens '], vinculos: [vinculo({ descricao: ' Compartilha viagens ' })] })
  const antes = JSON.stringify(recebido)
  const resultado = validar(recebido)
  assert.equal(resultado.erro, undefined)
  assert.equal(resultado.ecossistema?.area, 'Transporte')
  assert.deepEqual(resultado.ecossistema?.funcionalidades, ['Consultar viagens'])
  assert.equal(resultado.ecossistema?.vinculos[0].descricao, 'Compartilha viagens')
  assert.equal(JSON.stringify(recebido), antes)
})

for (const [nome, dados] of [
  ['perfil nulo', null],
  ['perfil em array', []],
  ['área com tipo inválido', { ...perfil(), area: 123 }],
  ['área acima do limite', perfil({ area: 'a'.repeat(101) })],
  ['quem usa acima do limite', perfil({ quemUsa: 'a'.repeat(301) })],
  ['responsável acima do limite', perfil({ responsavel: 'a'.repeat(121) })],
  ['mais de 20 funcionalidades', perfil({ funcionalidades: Array(21).fill('Consulta') })],
  ['funcionalidade acima do limite', perfil({ funcionalidades: ['a'.repeat(161)] })],
  ['funcionalidade vazia', perfil({ funcionalidades: ['   '] })],
  ['funcionalidade com tipo inválido', { ...perfil(), funcionalidades: [123] }],
  ['mais de 30 vínculos', perfil({ vinculos: Array(31).fill(vinculo()) })],
] as const) {
  verificar(`rejeita ${nome}`, () => assert.ok(validar(dados).erro))
}

for (const [nome, alteracoes] of [
  ['vínculo com o próprio sistema', { destinoSlug: 'alfa' }],
  ['destino arquivado fora do catálogo ativo', { destinoSlug: 'arquivado' }],
  ['destino inexistente', { destinoSlug: 'inexistente' }],
  ['identificador inválido', { destinoSlug: '../beta' }],
  ['tipo desconhecido', { tipo: 'DESCONHECIDO' }],
  ['direção desconhecida', { direcao: 'VOLTA' }],
  ['direção ausente', { direcao: undefined }],
  ['descrição vazia', { descricao: '   ' }],
  ['descrição acima do limite', { descricao: 'a'.repeat(501) }],
] as const) {
  verificar(`rejeita ${nome}`, () => assert.ok(validar({ ...perfil(), vinculos: [{ ...vinculo(), ...alteracoes }] }).erro))
}

verificar('rejeita destino e tipo duplicados mesmo com outra direção', () => {
  assert.ok(validar(perfil({ vinculos: [vinculo(), vinculo({ direcao: 'AMBOS' })] })).erro)
})

verificar('permite relações de tipos diferentes com o mesmo destino', () => {
  assert.equal(validar(perfil({ vinculos: [vinculo(), vinculo({ tipo: 'PROCESSO' })] })).ecossistema?.vinculos.length, 2)
})

verificar('permite o mesmo tipo de relação com destinos diferentes', () => {
  assert.equal(validar(perfil({ vinculos: [vinculo(), vinculo({ destinoSlug: 'gama' })] })).ecossistema?.vinculos.length, 2)
})

verificar('aceita explicitamente direção única e bidirecional', () => {
  for (const direcao of ['IDA', 'AMBOS'] as const) {
    assert.equal(validar(perfil({ vinculos: [vinculo({ direcao })] })).ecossistema?.vinculos[0].direcao, direcao)
  }
})

verificar('cadastro legado continua válido sem criar relações presumidas', () => {
  const legado = sistema('alfa')
  const resultado = validarSistema(legado)
  assert.ok(resultado.sistema)
  assert.equal(resultado.sistema.ecossistema, undefined)
  assert.deepEqual(perfilDoSistema(legado).vinculos, [])
})

const pesquisavel = sistema('alfa', perfil())
verificar('busca tarefa sem depender de acentos ou maiúsculas', () => {
  assert.ok(correspondeBuscaEcossistema(pesquisavel, 'CONFERENCIA'))
  assert.ok(correspondeBuscaEcossistema(pesquisavel, '  NOTAS   conferência '))
  assert.ok(correspondeBuscaEcossistema(pesquisavel, 'operacao'))
})

verificar('busca combina todos os termos e aceita consulta vazia', () => {
  assert.equal(correspondeBuscaEcossistema(pesquisavel, 'conferencia submarino'), false)
  assert.ok(correspondeBuscaEcossistema(pesquisavel, '   '))
})

verificar('mapa omite destinos arquivados e vínculos legados consigo mesmo', () => {
  // O catálogo entregue ao mapa contém apenas os sistemas ativos.
  const ativos = [
    sistema('alfa', perfil({ vinculos: [vinculo(), vinculo({ destinoSlug: 'arquivado' }), vinculo({ destinoSlug: 'alfa' })] })),
    sistema('beta', perfil()),
  ]
  const conexoes = conexoesDoEcossistema(ativos)
  assert.equal(conexoes.length, 1)
  assert.equal(conexoes[0].origemSlug, 'alfa')
  assert.equal(conexoes[0].destinoSlug, 'beta')
})

verificar('relação bidirecional recíproca aparece uma única vez', () => {
  const conexoes = conexoesDoEcossistema([
    sistema('alfa', perfil({ vinculos: [vinculo({ direcao: 'AMBOS' })] })),
    sistema('beta', perfil({ vinculos: [vinculo({ destinoSlug: 'alfa', direcao: 'AMBOS' })] })),
  ])
  assert.equal(conexoes.length, 1)
  assert.equal(conexoes[0].direcao, 'AMBOS')
  assert.deepEqual(new Set([conexoes[0].origemSlug, conexoes[0].destinoSlug]), new Set(['alfa', 'beta']))
})

verificar('fluxos de ida recíprocos preservam suas direções distintas', () => {
  const conexoes = conexoesDoEcossistema([
    sistema('alfa', perfil({ vinculos: [vinculo()] })),
    sistema('beta', perfil({ vinculos: [vinculo({ destinoSlug: 'alfa' })] })),
  ])
  assert.equal(conexoes.length, 2)
  assert.deepEqual(new Set(conexoes.map(c => `${c.origemSlug}>${c.destinoSlug}`)), new Set(['alfa>beta', 'beta>alfa']))
})

verificar('layout acomoda áreas com quantidades diferentes sem sobrepor cartões', () => {
  const catalogo = [6, 2, 4, 3].flatMap((quantidade, area) =>
    Array.from({ length: quantidade }, (_, indice) => sistema(`sistema-${area}-${indice}`, perfil({ area: `Área ${area}` })))
  )
  const mapa = organizarMapa(catalogo)
  assert.equal(mapa.posicoes.size, catalogo.length)
  for (const item of catalogo) {
    const posicao = mapa.posicoes.get(item.slug)
    assert.ok(posicao, `posição de ${item.slug}`)
    assert.ok(Number.isFinite(posicao.x) && Number.isFinite(posicao.y))
    assert.ok(posicao.x >= 0 && posicao.y >= 0)
    assert.ok(posicao.x + LARGURA_NO <= mapa.largura, `${item.slug} dentro da largura do mapa`)
    assert.ok(posicao.y + ALTURA_NO <= mapa.altura, `${item.slug} dentro da altura do mapa`)
  }
  const posicoes = [...mapa.posicoes.entries()]
  for (let i = 0; i < posicoes.length; i++) {
    for (let j = i + 1; j < posicoes.length; j++) {
      const [nomeA, a] = posicoes[i]
      const [nomeB, b] = posicoes[j]
      const separados = a.x + LARGURA_NO <= b.x || b.x + LARGURA_NO <= a.x || a.y + ALTURA_NO <= b.y || b.y + ALTURA_NO <= a.y
      assert.ok(separados, `${nomeA} e ${nomeB} não podem se sobrepor`)
    }
  }
})

verificar('catálogo vazio produz um mapa válido sem cartões', () => {
  const mapa = organizarMapa([])
  assert.equal(mapa.posicoes.size, 0)
  assert.equal(mapa.areas.length, 0)
  assert.ok(mapa.largura > 0 && mapa.altura > 0)
})

console.log(`${checks} verificações do ecossistema passaram.`)
