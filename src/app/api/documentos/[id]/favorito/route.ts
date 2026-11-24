import { documentosVisiveis } from '@/lib/publico'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirSessaoApi } from '@/lib/auth/api'

export const runtime = 'nodejs'

type Contexto = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Contexto) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro
  const { id } = await params
  const documento = await prisma.documento.findFirst({ where: { AND: [{ id }, documentosVisiveis(sessao)] }, select: { ativo: true } })
  if (!documento?.ativo) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

  await prisma.favoritoDocumento.upsert({
    where: { colaboradorId_documentoId: { colaboradorId: sessao.id, documentoId: id } },
    create: { colaboradorId: sessao.id, documentoId: id },
    update: {},
  })
  return NextResponse.json({ favorito: true })
}

export async function DELETE(_req: Request, { params }: Contexto) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro
  const { id } = await params
  await prisma.favoritoDocumento.deleteMany({ where: { colaboradorId: sessao.id, documentoId: id } })
  return NextResponse.json({ favorito: false })
}
