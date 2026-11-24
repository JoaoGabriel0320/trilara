import { NextResponse, type NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/prisma'
import { exigirSessaoApi } from '@/lib/auth/api'
import { ImagemInvalidaError, chaveValida, existeArquivo, removerArquivo, salvarImagem, streamArquivo, tamanhoArquivo } from '@/lib/storage'
import { lerFormularioLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const LIMITE_FOTO_BYTES = 5 * 1024 * 1024
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']

function tipoDaChave(chave: string): string | null {
  if (!chave.startsWith('perfis/') || !chaveValida(chave)) return null
  if (chave.endsWith('.jpg')) return 'image/jpeg'
  if (chave.endsWith('.png')) return 'image/png'
  if (chave.endsWith('.webp')) return 'image/webp'
  return null
}

export async function GET() {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const colaborador = await prisma.colaborador.findUnique({ where: { id: sessao.id }, select: { fotoKey: true } })
  if (!colaborador?.fotoKey) return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })

  const tipo = tipoDaChave(colaborador.fotoKey)
  if (!tipo || !(await existeArquivo(colaborador.fotoKey))) {
    console.error(`[conta/foto] arquivo indisponível para colaborador ${sessao.id}`)
    return NextResponse.json({ error: 'Foto indisponível.' }, { status: 502 })
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

export async function PUT(req: NextRequest) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const form = await lerFormularioLimitado(req, 6 * 1024 * 1024)
  if (!form) return NextResponse.json({ error: 'Envio inválido ou maior que 6 MB.' }, { status: 413 })

  const arquivo = form.get('foto')
  if (!(arquivo instanceof File) || arquivo.size === 0 || !TIPOS_FOTO.includes(arquivo.type)) {
    return NextResponse.json({ error: 'Escolha uma foto JPG, PNG ou WebP.' }, { status: 400 })
  }
  if (arquivo.size > LIMITE_FOTO_BYTES) {
    return NextResponse.json({ error: 'A foto pode ter no máximo 5 MB.' }, { status: 413 })
  }

  const atual = await prisma.colaborador.findUnique({ where: { id: sessao.id }, select: { fotoKey: true } })
  if (!atual) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

  let chaveNova: string | null = null
  try {
    const salvo = await salvarImagem('perfis', Buffer.from(await arquivo.arrayBuffer()), arquivo.type)
    chaveNova = salvo.chave
    await prisma.colaborador.update({ where: { id: sessao.id }, data: { fotoKey: chaveNova } })
  } catch (falha) {
    if (chaveNova) await removerArquivo(chaveNova)
    if (falha instanceof ImagemInvalidaError) return NextResponse.json({ error: falha.message }, { status: 400 })
    console.error('[conta/foto] falha ao salvar', falha)
    return NextResponse.json({ error: 'Não foi possível salvar a foto.' }, { status: 500 })
  }

  if (atual.fotoKey) await removerArquivo(atual.fotoKey)
  return NextResponse.json({ ok: true, fotoKey: chaveNova })
}

export async function DELETE() {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const atual = await prisma.colaborador.findUnique({ where: { id: sessao.id }, select: { fotoKey: true } })
  if (!atual) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

  if (atual.fotoKey) {
    await prisma.colaborador.update({ where: { id: sessao.id }, data: { fotoKey: null } })
    await removerArquivo(atual.fotoKey)
  }
  return NextResponse.json({ ok: true, fotoKey: null })
}
