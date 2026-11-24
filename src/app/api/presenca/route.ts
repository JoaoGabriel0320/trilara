import { NextResponse } from 'next/server'
import { getSessao, sessaoFoiSubstituida } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

async function respostaSemSessao() {
  const substituida = await sessaoFoiSubstituida()
  return NextResponse.json({
    error: substituida ? 'Um novo acesso encerrou esta sessão.' : 'Sessão expirada.',
    codigo: substituida ? 'NOVO_LOGIN' : 'SESSAO_EXPIRADA',
  }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const sessao = await getSessao()
  if (!sessao) return respostaSemSessao()
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST() {
  const sessao = await getSessao()
  if (!sessao) return respostaSemSessao()

  await prisma.colaborador.update({
    where: { id: sessao.id },
    data: { ultimaAtividadeEm: new Date() },
  })

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
}
