import assert from 'node:assert/strict'
import { responderComIa } from '../src/lib/assistente-ia'
import type { RespostaAssistente } from '../src/lib/assistente-hub'
import { MODELOS_GROQ } from '../src/lib/assistente-modelos-groq'

const originalFetch = globalThis.fetch
const chaves = ['GROQ_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_AI_TOKEN', 'OPENROUTER_API_KEY'] as const
const originais = Object.fromEntries(chaves.map((chave) => [chave, process.env[chave]]))
const resultado: RespostaAssistente = {
  resposta: 'Resposta da busca guiada',
  fontes: [{ id: '1', titulo: 'Manual de teste', sistema: 'Portal de clientes', tipo: 'ARTIGO', href: '/documentacao/portal-de-clientes/teste', trecho: 'Para consultar a solicitação, abra o módulo de atendimento.' }],
}

async function executar() {
  process.env.GROQ_API_KEY = 'teste-groq'
  process.env.CLOUDFLARE_ACCOUNT_ID = 'a'.repeat(32)
  process.env.CLOUDFLARE_AI_TOKEN = 'teste-cloudflare'
  process.env.OPENROUTER_API_KEY = 'teste-openrouter'

  const chamadas: string[] = []
  globalThis.fetch = async (entrada, init) => {
    const url = String(entrada)
    chamadas.push(url)
    const corpo = JSON.parse(String(init?.body)) as { messages: { content: string }[] }
    assert.match(corpo.messages[1].content, /Para consultar o canhoto/)
    if (url.includes('groq.com')) return new Response('{}', { status: 429, headers: { 'retry-after': '600' } })
    if (url.includes('cloudflare.com')) return Response.json({ result: { response: 'Abra o módulo de triagem para consultar o canhoto. [1]' } })
    throw new Error('OpenRouter não deveria ser chamado')
  }

  const resposta = await responderComIa('Como consultar o canhoto?', resultado)
  assert.match(resposta.resposta, /módulo de triagem/)
  assert.deepEqual(resposta.fontes, resultado.fontes)
  assert.equal(chamadas.length, MODELOS_GROQ.length + 1)
  assert.ok(chamadas.slice(0, MODELOS_GROQ.length).every((url) => url.includes('groq.com')))
  assert.match(chamadas.at(-1)!, /cloudflare.com/)

  chamadas.length = 0
  await responderComIa('Como consultar o canhoto?', resultado)
  assert.equal(chamadas.length, 1, 'Groq deve aguardar o Retry-After')
  assert.match(chamadas[0], /cloudflare.com/)

  chamadas.length = 0
  globalThis.fetch = async (entrada) => {
    const url = String(entrada)
    chamadas.push(url)
    if (url.includes('cloudflare.com')) return Response.json({ errors: [{ code: 3036 }] }, { status: 429 })
    if (url.includes('openrouter.ai')) return Response.json({ choices: [{ message: { content: 'Resposta do terceiro provedor [1]' } }] })
    throw new Error('Groq ainda está em pausa')
  }
  const terceiraOpcao = await responderComIa('Como consultar o canhoto?', resultado)
  assert.equal(terceiraOpcao.resposta, 'Resposta do terceiro provedor [1]')
  assert.equal(chamadas.length, 2)

  globalThis.fetch = async () => new Response('{}', { status: 503 })
  const indisponivel = await responderComIa('Como consultar o canhoto?', resultado)
  assert.equal(indisponivel.resposta, resultado.resposta, 'Sem provedor, mantém a busca guiada')

  let houveChamada = false
  globalThis.fetch = async () => { houveChamada = true; throw new Error('Não deve chamar a API sem fonte') }
  await responderComIa('Pergunta sem fonte', { resposta: 'Nada encontrado', fontes: [] })
  assert.equal(houveChamada, false)
  await responderComIa('O que é o Portal de clientes?', {
    resposta: 'Descrição do catálogo',
    fontes: [{ id: 'sistema-portal-de-clientes', titulo: 'Portal de clientes', sistema: 'Portal de clientes', tipo: 'SISTEMA', href: '/documentacao/portal-de-clientes', trecho: 'Descrição do catálogo' }],
  })
  assert.equal(houveChamada, false, 'Descrição do catálogo não é documento publicado')
}

executar().then(() => console.log('Assistente IA: troca de provedor e fallback verificados.')).catch((erro) => {
  console.error(erro)
  process.exitCode = 1
}).finally(() => {
  globalThis.fetch = originalFetch
  for (const chave of chaves) {
    if (originais[chave] === undefined) delete process.env[chave]
    else process.env[chave] = originais[chave]
  }
})
