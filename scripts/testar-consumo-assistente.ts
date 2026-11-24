import assert from 'node:assert/strict'
import { loadEnvConfig } from '@next/env'
import { prisma } from '../src/lib/prisma'
import { responderComIa } from '../src/lib/assistente-ia'
import type { RespostaAssistente } from '../src/lib/assistente-hub'

loadEnvConfig(process.cwd())

const originalFetch = globalThis.fetch
const originalGroq = process.env.GROQ_API_KEY
const resultado: RespostaAssistente = {
  resposta: 'Busca guiada',
  fontes: [{ id: 'teste', titulo: 'Manual de teste', sistema: 'Portal de clientes', tipo: 'ARTIGO', href: '/documentacao/portal-de-clientes/teste', trecho: 'O procedimento de teste está documentado.' }],
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url || !['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname)) {
    throw new Error('Este teste só pode acessar o banco local.')
  }
  const colaborador = await prisma.colaborador.findFirst({ select: { id: true } })
  if (!colaborador) throw new Error('É necessário um colaborador no banco local.')
  const desde = new Date()
  process.env.GROQ_API_KEY = 'chave-de-teste'
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: 'Resposta de teste [1]' } }],
    usage: { prompt_tokens: 42, completion_tokens: 18, total_tokens: 60 },
  })

  try {
    const resposta = await responderComIa('Qual é o procedimento de teste?', resultado, { colaboradorId: colaborador.id, sistemaSlug: '__teste_consumo__' })
    assert.equal(resposta.resposta, 'Resposta de teste [1]')
    const registro = await prisma.usoAssistente.findFirst({
      where: { colaboradorId: colaborador.id, criadoEm: { gte: desde }, provedor: 'Groq', sistemaSlug: '__teste_consumo__' },
      orderBy: { criadoEm: 'desc' },
    })
    assert.ok(registro, 'A tentativa deve ser registrada no banco')
    assert.equal(registro.status, 'SUCESSO')
    assert.equal(registro.entradaTokens, 42)
    assert.equal(registro.saidaTokens, 18)
    assert.equal(registro.totalTokens, 60)
    console.log('Consumo do assistente: registro e contagem de tokens verificados.')
  } finally {
    await prisma.usoAssistente.deleteMany({ where: { colaboradorId: colaborador.id, criadoEm: { gte: desde }, provedor: 'Groq', sistemaSlug: '__teste_consumo__' } })
    globalThis.fetch = originalFetch
    if (originalGroq === undefined) delete process.env.GROQ_API_KEY
    else process.env.GROQ_API_KEY = originalGroq
    await prisma.$disconnect()
  }
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 })
