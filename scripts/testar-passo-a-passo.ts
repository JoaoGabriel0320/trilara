import assert from 'node:assert/strict'
import { aplicarMarcacao } from '../src/lib/markdown-edicao'
import {
  complementoAuditoria,
  estimarMinutosLeitura,
  interpretarPassos,
  mensagemLimiteEnvioPrints,
  PassosInvalidosError,
  textoPesquisavelDosPassos,
  trechosDoGuia,
  type PassoComTexto,
} from '../src/lib/passos-documento'

const imagemId = '11111111-1111-4111-8111-111111111111'
const base = { titulo: 'Abrir a tela', texto: 'Clique em **Recebimento**.', destaque: null, print: null }

function erro(passos: unknown, quantidadePrintsNovos = 0, imagens = new Set<string>()) {
  assert.throws(
    () => interpretarPassos(typeof passos === 'string' ? passos : JSON.stringify(passos), { imagensDoDocumento: imagens, quantidadePrintsNovos }),
    PassosInvalidosError,
  )
}

assert.equal(interpretarPassos(JSON.stringify([base]), { imagensDoDocumento: new Set(), quantidadePrintsNovos: 0 })[0].titulo, 'Abrir a tela')
const passoComImagem = interpretarPassos(JSON.stringify([{ ...base, print: { imagemId } }]), { imagensDoDocumento: new Set([imagemId]), quantidadePrintsNovos: 0 })[0]
assert.ok(passoComImagem.print && 'existente' in passoComImagem.print)
assert.equal(passoComImagem.print.existente, imagemId)
assert.equal(interpretarPassos(JSON.stringify([{ ...base, print: { novo: 0 } }]), { imagensDoDocumento: new Set(), quantidadePrintsNovos: 1 })[0].ordem, 0)
const comAcesso = interpretarPassos(JSON.stringify([{ ...base, caminhoAcesso: 'Portal de clientes → Solicitações → Pedidos', printAcesso: { novo: 0 }, print: { novo: 1 } }]), { imagensDoDocumento: new Set(), quantidadePrintsNovos: 2 })[0]
assert.equal(comAcesso.caminhoAcesso, 'Portal de clientes → Solicitações → Pedidos')
assert.deepEqual(comAcesso.printAcesso, { novo: 0 })
assert.deepEqual(comAcesso.print, { novo: 1 })
erro('não é JSON')
erro([])
erro(Array.from({ length: 41 }, (_, i) => ({ ...base, titulo: `Passo ${i}` })))
erro([{ ...base, titulo: '' }])
erro([{ ...base, titulo: 'x'.repeat(201) }])
erro([{ ...base, texto: 'x'.repeat(10_001) }])
erro([{ ...base, caminhoAcesso: 'x'.repeat(301) }])
erro([{ ...base, printAcesso: { novo: 0 }, print: { novo: 0 } }], 1)
erro([{ ...base, printAcesso: { imagemId }, print: { imagemId } }], 0, new Set([imagemId]))
erro([{ ...base, destaque: { tipo: 'REGRA', texto: '' } }])
erro([{ ...base, destaque: { tipo: 'OUTRO', texto: 'x' } }])
erro([{ ...base, destaque: { tipo: 'DICA', texto: 'x'.repeat(1_001) } }])
erro([{ ...base, print: { imagemId } }])
erro([{ ...base, print: { novo: 1 } }], 1)
erro([{ ...base }, { ...base, print: { imagemId } }, { ...base, print: { imagemId } }], 0, new Set([imagemId]))
erro([{ ...base }], 1)

assert.equal(mensagemLimiteEnvioPrints(70_778_880), 'Os prints novos somam 68 MB. Envie até 64 MB por vez: salve o guia e adicione os demais prints depois.')
const pesquisaveis: PassoComTexto[] = [
  { titulo: 'Primeiro título', texto: 'Texto com **markdown**.', destaqueTipo: 'REGRA', destaqueTexto: 'Pedido aprovado' },
  { titulo: 'Segundo título', texto: null, destaqueTipo: null, destaqueTexto: null },
]
const textoBusca = textoPesquisavelDosPassos(pesquisaveis)
assert.ok(textoBusca.startsWith('Primeiro título Segundo título'))
assert.ok(textoBusca.includes('Texto com markdown. Regra: Pedido aprovado'))
assert.ok(textoPesquisavelDosPassos([{ ...pesquisaveis[0], caminhoAcesso: 'Portal de clientes → Solicitações → Pedidos' }]).includes('Caminho de acesso: Portal de clientes → Solicitações → Pedidos'))
assert.equal(textoPesquisavelDosPassos(pesquisaveis, 10).length, 10)

const tresJanelas = trechosDoGuia([{ titulo: 'Título', texto: 'a'.repeat(1_000), destaqueTipo: null, destaqueTexto: null }])
assert.equal(tresJanelas.length, 3)
assert.ok(tresJanelas.every((trecho) => !trecho.texto.startsWith('Título') && trecho.busca.startsWith('Título.')))
const vazio = trechosDoGuia([{ titulo: 'Só título', texto: null, destaqueTipo: null, destaqueTexto: null }])
assert.equal(vazio.length, 1)
assert.equal(vazio[0].texto, '')
const quarenta = trechosDoGuia(Array.from({ length: 40 }, (_, indice) => ({ titulo: `P${indice + 1}`, texto: 'x'.repeat(1_500), destaqueTipo: null, destaqueTexto: null })))
assert.equal(quarenta.length, 120)
for (let numero = 1; numero <= 40; numero++) assert.equal(quarenta.filter((trecho) => trecho.passo.numero === numero).length, 3)
assert.equal(trechosDoGuia(Array.from({ length: 2 }, (_, indice) => ({ titulo: `P${indice + 1}`, texto: 'x'.repeat(10_000), destaqueTipo: null, destaqueTexto: null }))).length, 48)

assert.equal(estimarMinutosLeitura([{ titulo: 'Passo', texto: 'palavra '.repeat(200), destaqueTipo: null, destaqueTexto: null }], 0), 1)
assert.equal(complementoAuditoria({ tipoAnterior: null, tipoNovo: 'PASSO_A_PASSO', totalPassos: 2, passosDescartados: 0, comeceAntes: null, comeceDepois: false }), ' (passo a passo, 2 passos)')
assert.equal(complementoAuditoria({ tipoAnterior: 'PASSO_A_PASSO', tipoNovo: 'ARTIGO', totalPassos: 0, passosDescartados: 2, comeceAntes: true, comeceDepois: false }), ' (formato: Passo a passo → Página; 2 passos descartados; removido de "Comece por aqui")')

assert.deepEqual(aplicarMarcacao('abc', 0, 3, 'negrito'), { valor: '**abc**', inicio: 2, fim: 5 })
assert.deepEqual(aplicarMarcacao('', 0, 0, 'italico'), { valor: '*texto*', inicio: 1, fim: 6 })
assert.equal(aplicarMarcacao('um\ndois', 0, 7, 'lista').valor, '- um\n- dois')
assert.equal(aplicarMarcacao('- um\n- dois', 0, 11, 'lista').valor, 'um\ndois')
assert.equal(aplicarMarcacao('site', 0, 4, 'link').valor, '[site](https://)')

console.log('Passo a passo: validação, busca, trechos, leitura e markdown verificados.')
