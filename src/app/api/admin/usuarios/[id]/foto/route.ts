import { Readable } from 'node:stream'
import { NextResponse } from 'next/server'
import { exigirAdminApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { chaveValida, existeArquivo, removerArquivo, streamArquivo, tamanhoArquivo } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function tipoDaFoto(chave: string): string | null {
  if (!chave.startsWith('perfis/') || !chaveValida(chave)) return null
  if (chave.endsWith('.jpg')) return 'image/jpeg'
  if (chave.endsWith('.png')) return 'image/png'
  if (chave.endsWith('.webp')) return 'image/webp'
  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const colaborador = await prisma.colaborador.findUnique({ where: { id }, select: { fotoKey: true } })
  if (!colaborador?.fotoKey) return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })

  const tipo = tipoDaFoto(colaborador.fotoKey)
  if (!tipo || !(await existeArquivo(colaborador.fotoKey))) {
    return NextResponse.json({ error: 'Foto indisponível.' }, { status: 404 })
  }

  const tamanho = await tamanhoArquivo(colaborador.fotoKey)
  const stream = Readable.toWeb(await streamArquivo(colaborador.fotoKey) as Readable) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': tipo,
      'Content-Length': String(tamanho),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const colaborador = await prisma.colaborador.findUnique({
    where: { id },
    select: { nome: true, fotoKey: true, adminProtegido: true },
  })
  if (!colaborador) return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  if (colaborador.adminProtegido && id !== sessao.id) {
    return NextResponse.json({ error: 'Esta conta administrativa é protegida.' }, { status: 403 })
  }
  if (!colaborador.fotoKey) return NextResponse.json({ ok: true, fotoKey: null })

  const alteracao = await prisma.colaborador.updateMany({
    where: { id, fotoKey: colaborador.fotoKey, ...(id !== sessao.id ? { adminProtegido: false } : {}) },
    data: { fotoKey: null },
  })
  if (alteracao.count !== 1) {
    return NextResponse.json({ error: 'A foto foi alterada. Atualize a página e tente novamente.' }, { status: 409 })
  }

  try {
    await removerArquivo(colaborador.fotoKey)
  } catch (falha) {
    console.error(`[admin/usuarios/${id}/foto] falha ao remover arquivo`, falha)
  }
  await registrarAuditoria({
    ator: sessao,
    acao: 'editar',
    entidade: 'Colaborador',
    entidadeId: id,
    descricao: `${sessao.nome} removeu a foto de ${colaborador.nome}`,
  })
  return NextResponse.json({ ok: true, fotoKey: null }, { headers: { 'Cache-Control': 'no-store' } })
}
