import { NextResponse } from 'next/server'
import { exigirInternoApi } from '@/lib/auth/api'
import { consumoDiarioAssistente } from '@/lib/assistente-limite'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!ASSISTENTE_ATIVO) return NextResponse.json({ error: 'Este recurso está temporariamente desativado.' }, { status: 404 })
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro
  const consumo = await consumoDiarioAssistente(sessao.id)
  return NextResponse.json(consumo, { headers: { 'Cache-Control': 'private, no-store' } })
}
