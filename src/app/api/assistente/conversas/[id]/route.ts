import { NextResponse } from 'next/server'
import { exigirInternoApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!ASSISTENTE_ATIVO) return NextResponse.json({ error: 'Este recurso está temporariamente desativado.' }, { status: 404 })
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const excluidas = await prisma.conversaAssistente.deleteMany({ where: { id, colaboradorId: sessao.id } })
  if (!excluidas.count) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'private, no-store' } })
}
