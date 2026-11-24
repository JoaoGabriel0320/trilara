import assert from 'node:assert/strict'
import { sistemasMencionados } from '../src/lib/assistente-escopo'

const sistemas = [
  { slug: 'portal-de-clientes', name: 'Portal de clientes' },
  { slug: 'painel-de-entregas', name: 'Painel de entregas' },
  { slug: 'agenda-de-operacoes', name: 'Agenda de operações' },
  { slug: 'gestao-financeira', name: 'Gestão financeira' },
  { slug: 'controle-de-estoque', name: 'Controle de estoque' },
]

function slugs(pergunta: string) {
  return sistemasMencionados(pergunta, sistemas).map((sistema) => sistema.slug)
}

assert.deepEqual(slugs('Como consultar o Portal de clientes?'), ['portal-de-clientes'])
assert.deepEqual(slugs('Como usar a Agenda de operações?'), ['agenda-de-operacoes'])
assert.deepEqual(slugs('Como consultar o Controle de estoque?'), ['controle-de-estoque'])
assert.deepEqual(slugs('Onde fica o Painel de entregas?'), ['painel-de-entregas'])
assert.deepEqual(slugs('Como dar entrada em uma nota no Controle de estoque?'), ['controle-de-estoque'])
assert.deepEqual(slugs('Portal de clientes e Agenda de operações usam o mesmo procedimento?'), ['portal-de-clientes', 'agenda-de-operacoes'])
assert.deepEqual(slugs('Como consultar o canhoto?'), [], 'Assunto sem sistema mantém busca geral')

console.log('Escopo do assistente: sistemas fictícios verificados.')
