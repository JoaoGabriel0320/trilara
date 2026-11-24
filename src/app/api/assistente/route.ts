import { limparCitacoesDoAssistente } from '@/lib/assistente-citacoes'
import { NextResponse } from 'next/server'
import { exigirInternoApi } from '@/lib/auth/api'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'
import { responderComDocumentos } from '@/lib/assistente-hub'
import { responderComIa } from '@/lib/assistente-ia'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { limiteConsultas } from '@/lib/assistente-consultas'
import { sistemaSlugCanonico } from '@/lib/sistema-canonico'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMITE_POR_JANELA = 12
const JANELA_MS = 5 * 60 * 1000
const chamadas = new Map<string, { inicio: number; total: number }>()
const consultasEmAndamento = new Set<string>()

function podePerguntar(colaboradorId: string): boolean {
  const agora = Date.now()
  for (const [id, registro] of chamadas) {
    if (agora - registro.inicio >= JANELA_MS) chamadas.delete(id)
  }
  const registro = chamadas.get(colaboradorId)
  if (!registro) {
    chamadas.set(colaboradorId, { inicio: agora, total: 1 })
    return true
  }
  if (registro.total >= LIMITE_POR_JANELA) return false
  registro.total++
  return true
}

export async function POST(req: Request) {
  if (!ASSISTENTE_ATIVO) return NextResponse.json({ error: 'Este recurso está temporariamente desativado.' }, { status: 404 })
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ error: 'Envie uma pergunta em JSON.' }, { status: 415 })
  }
  const corpo = await lerObjetoJsonLimitado(req, 2048)
  const pergunta = typeof corpo?.pergunta === 'string' ? corpo.pergunta.trim() : ''
  const sistemaInformado = typeof corpo?.sistema === 'string' ? corpo.sistema.trim() : ''
  const sistema = sistemaSlugCanonico(sistemaInformado)
  const conversaId = typeof corpo?.conversaId === 'string' ? corpo.conversaId.trim() : ''
  if (pergunta.length < 5 || pergunta.length > 500 || sistema.length > 64 || !/^[a-z0-9-]*$/.test(sistema)) {
    return NextResponse.json({ error: 'Digite uma pergunta de 5 a 500 caracteres.' }, { status: 400 })
  }
  if (conversaId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversaId)) {
    return NextResponse.json({ error: 'Conversa inválida.' }, { status: 400 })
  }
  const conversa = conversaId ? await prisma.conversaAssistente.findFirst({
    where: { id: conversaId, colaboradorId: sessao.id },
  }) : null
  if (conversaId && !conversa) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })
  if (conversa && conversa.sistemaSlug !== (sistema || null)) {
    return NextResponse.json({ error: 'Inicie uma nova conversa para trocar de sistema.' }, { status: 400 })
  }
  if (consultasEmAndamento.has(sessao.id)) {
    return NextResponse.json({ error: 'Aguarde a resposta anterior antes de fazer outra pergunta.' }, { status: 429 })
  }
  if (!podePerguntar(sessao.id)) {
    return NextResponse.json({ error: 'Muitas perguntas em pouco tempo. Aguarde alguns minutos.' }, { status: 429 })
  }
  consultasEmAndamento.add(sessao.id)

  try {
    const resultadoBusca = await responderComDocumentos(pergunta, sistema)
    const resposta = await responderComIa(pergunta, resultadoBusca, { colaboradorId: sessao.id, sistemaSlug: sistema || null })
    resposta.resposta = limparCitacoesDoAssistente(resposta.resposta)
    let conversaSalvaId: string | null = null
    try {
      conversaSalvaId = await prisma.$transaction(async (tx) => {
        const destino = conversa ?? await tx.conversaAssistente.create({
          data: { colaboradorId: sessao.id, sistemaSlug: sistema || null, titulo: pergunta },
        })
        await tx.consultaAssistente.create({
          data: {
            colaboradorId: sessao.id,
            conversaId: destino.id,
            sistemaSlug: sistema || null,
            pergunta,
            resposta: resposta.resposta,
            fontes: resposta.fontes as unknown as Prisma.InputJsonValue,
            aviso: resposta.aviso ?? null,
          },
        })
        if (conversa) await tx.conversaAssistente.update({
          where: { id: conversa.id },
          data: { atualizadaEm: new Date() },
        })
        return destino.id
      })
    } catch (erroHistorico) {
      console.error('[assistente] Não foi possível salvar conversa:', erroHistorico instanceof Error ? erroHistorico.name : 'erro desconhecido')
    }
    if (conversaSalvaId) {
      try {
        await prisma.conversaAssistente.deleteMany({ where: { atualizadaEm: { lt: limiteConsultas() } } })
      } catch (erroLimpeza) {
        console.error('[assistente] Não foi possível limpar conversas antigas:', erroLimpeza instanceof Error ? erroLimpeza.name : 'erro desconhecido')
      }
    }
    return NextResponse.json({ ...resposta, historicoSalvo: Boolean(conversaSalvaId), conversaId: conversaSalvaId }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (erroInterno) {
    console.error('[assistente] Erro ao consultar documentação:', erroInterno)
    return NextResponse.json({ error: 'Não consegui consultar os manuais agora. Tente novamente.' }, { status: 500 })
  } finally {
    consultasEmAndamento.delete(sessao.id)
  }
}
