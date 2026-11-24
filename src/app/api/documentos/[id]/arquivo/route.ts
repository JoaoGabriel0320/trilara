import { podeLerDocumento } from '@/lib/publico'
// src/app/api/documentos/[id]/arquivo/route.ts
//
// Única porta de saída dos PDFs e GIFs. Valida a sessão, lê do storage privado e faz
// stream. Nenhum arquivo é publicado em public/ — lá o middleware não roda.

import { NextResponse, type NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import { prisma } from '@/lib/prisma'
import { getSessao } from '@/lib/auth/session'
import { chaveValida, existeArquivo, streamArquivo, tamanhoArquivo } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // O middleware já cobre esta rota; a checagem aqui é a que vale se o matcher
  // mudar — e é barata.
  const sessao = await getSessao()
  if (!sessao) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 })
  }

  const { id } = await params

  const documento = await prisma.documento.findFirst({
    where: { id },
    select: { publico: true, sistemaSlug: true, ativo: true, tipo: true, arquivoKey: true, arquivoNome: true, slug: true },
  })

  if (!documento || !podeLerDocumento(sessao, documento) || (documento.tipo !== 'PDF' && documento.tipo !== 'GIF') || !documento.arquivoKey) {
    return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  const ehGif = documento.tipo === 'GIF'
  // A extensão da chave precisa bater com o tipo: nunca servir um .pdf como GIF (ou o inverso).
  const extensaoCoerente = documento.arquivoKey.endsWith(ehGif ? '.gif' : '.pdf')

  if (!extensaoCoerente || !chaveValida(documento.arquivoKey) || !(await existeArquivo(documento.arquivoKey))) {
    // Registro existe mas o arquivo sumiu do armazenamento — é erro de operação, não 404
    // do usuário; logar ajuda a achar o que quebrou no deploy.
    console.error(`[documentos] arquivo ausente no storage: ${documento.arquivoKey}`)
    return NextResponse.json({ error: 'Arquivo indisponível. Avise o suporte.' }, { status: 502 })
  }

  const baixar = req.nextUrl.searchParams.get('download') === '1'
  const nome = (documento.arquivoNome ?? `${documento.slug}.${ehGif ? 'gif' : 'pdf'}`).replace(/["\\\x00-\x1f\x7f]/g, '').slice(0, 255)
  const tamanho = await tamanhoArquivo(documento.arquivoKey)
  const stream = Readable.toWeb(await streamArquivo(documento.arquivoKey) as Readable) as ReadableStream

  return new NextResponse(stream, {
    headers: {
      'Content-Type': ehGif ? 'image/gif' : 'application/pdf',
      'Content-Length': String(tamanho),
      'Content-Disposition': `${baixar ? 'attachment' : 'inline'}; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(nome)}`,
      // private + no-store: proxy e CDN não podem guardar manual interno em cache
      // compartilhado, onde ele sairia sem passar pela sessão.
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  })
}
