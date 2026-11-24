import { prisma } from '@/lib/prisma'

export const LIMITE_TOKENS_DIA = 10_000
export const LIMITE_TENTATIVAS_DIA = 30

export type ConsumoDiarioAssistente = {
  usadoTokens: number
  limiteTokens: number
  restanteTokens: number
  tentativas: number
  limiteTentativas: number
  restanteTentativas: number
  semContagem: number
  resetEm: string
  bloqueado: boolean
}

export function periodoDiarioUtc(agora = new Date()) {
  const inicio = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
  const reset = new Date(inicio.getTime() + 86_400_000)
  return { inicio, reset }
}

export async function consumoDiarioAssistente(colaboradorId: string, agora = new Date()): Promise<ConsumoDiarioAssistente> {
  const { inicio, reset } = periodoDiarioUtc(agora)
  const uso = await prisma.usoAssistente.aggregate({
    where: { colaboradorId, criadoEm: { gte: inicio, lt: reset } },
    _count: { _all: true, totalTokens: true },
    _sum: { totalTokens: true },
  })
  const usadoTokens = uso._sum.totalTokens ?? 0
  const tentativas = uso._count._all
  return {
    usadoTokens,
    limiteTokens: LIMITE_TOKENS_DIA,
    restanteTokens: Math.max(0, LIMITE_TOKENS_DIA - usadoTokens),
    tentativas,
    limiteTentativas: LIMITE_TENTATIVAS_DIA,
    restanteTentativas: Math.max(0, LIMITE_TENTATIVAS_DIA - tentativas),
    semContagem: tentativas - uso._count.totalTokens,
    resetEm: reset.toISOString(),
    bloqueado: usadoTokens >= LIMITE_TOKENS_DIA || tentativas >= LIMITE_TENTATIVAS_DIA,
  }
}

export function avisoLimiteAssistente(consumo: ConsumoDiarioAssistente): string {
  const reset = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }).format(new Date(consumo.resetEm))
  return `Seu limite diário de IA foi atingido. Você ainda pode consultar os documentos. Novas respostas por IA ficam disponíveis em ${reset} (São Paulo).`
}
