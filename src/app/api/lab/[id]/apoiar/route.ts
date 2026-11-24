// src/app/api/lab/[id]/apoiar/route.ts — alterna o apoio do colaborador logado
//
// Um apoio por pessoa por ideia (constraint única no banco). Chamar de novo
// remove o apoio — é o mesmo gesto de "curtir de novo pra descurtir".

import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirInternoApi } from '@/lib/auth/api'

export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  const { id } = await params
  const ideia = await prisma.ideia.findUnique({ where: { id }, select: { id: true } })
  if (!ideia) return NextResponse.json({ error: 'Ideia não encontrada.' }, { status: 404 })

  const existente = await prisma.apoioIdeia.findUnique({
    where: { ideiaId_colaboradorId: { ideiaId: id, colaboradorId: sessao.id } },
  })

  if (existente) {
    await prisma.apoioIdeia.delete({ where: { id: existente.id } })
  } else {
    await prisma.apoioIdeia.create({ data: { ideiaId: id, colaboradorId: sessao.id } })
  }

  const total = await prisma.apoioIdeia.count({ where: { ideiaId: id } })

  return NextResponse.json({ ok: true, apoiado: !existente, total })
}
