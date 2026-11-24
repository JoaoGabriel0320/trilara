import { podeLerDocumento } from '@/lib/publico'
import { NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/prisma'
import { getSessao } from '@/lib/auth/session'
import { podeLerRascunho } from '@/lib/auth/permissoes'
import { chaveValida, existeArquivo, streamArquivo, tamanhoArquivo } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; imagemId: string }> }) {
  const sessao = await getSessao()
  if (!sessao) return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 })

  const { id, imagemId } = await params
  const imagem = await prisma.documentoImagem.findUnique({
    where: { id: imagemId },
    select: {
      documentoId: true,
      arquivoKey: true,
      mimeType: true,
      documento: { select: { ativo: true, tipo: true, autorId: true, publico: true, sistemaSlug: true } },
    },
  })
  if (!imagem || imagem.documentoId !== id || !['ARTIGO', 'PASSO_A_PASSO'].includes(imagem.documento.tipo) || (!podeLerDocumento(sessao, imagem.documento) && !(sessao.tipoAcesso === 'INTERNO' && podeLerRascunho(sessao, imagem.documento.autorId)))) {
    return NextResponse.json({ error: 'Imagem não encontrada.' }, { status: 404 })
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(imagem.mimeType) || !chaveValida(imagem.arquivoKey)) {
    console.error(`[documentos] imagem com dados inválidos: ${imagemId}`)
    return NextResponse.json({ error: 'Imagem indisponível. Avise o suporte.' }, { status: 502 })
  }
  if (!(await existeArquivo(imagem.arquivoKey))) {
    console.error(`[documentos] imagem ausente no storage: ${imagem.arquivoKey}`)
    return NextResponse.json({ error: 'Imagem indisponível. Avise o suporte.' }, { status: 502 })
  }

  const tamanho = await tamanhoArquivo(imagem.arquivoKey)
  const stream = Readable.toWeb(await streamArquivo(imagem.arquivoKey) as Readable) as ReadableStream
  return new NextResponse(stream, {
    headers: {
      'Content-Type': imagem.mimeType,
      'Content-Length': String(tamanho),
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  })
}
