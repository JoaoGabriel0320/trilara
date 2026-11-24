import { documentosVisiveis } from '@/lib/publico'
import { NextResponse, type NextRequest } from 'next/server'
import { exigirSessaoApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'
import { LIMITE_TITULO_PASSO, MAX_PASSOS_DOCUMENTO } from '@/lib/passos-documento'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const { id } = await params
  const corpo = await lerObjetoJsonLimitado(req)
  const mensagem = typeof corpo?.mensagem === 'string' ? corpo.mensagem.trim() : ''
  if (mensagem.length < 10 || mensagem.length > 1500) {
    return NextResponse.json({ error: 'Descreva o problema em 10 a 1500 caracteres.' }, { status: 400 })
  }

  const documento = await prisma.documento.findFirst({
    where: { AND: [{ id }, documentosVisiveis(sessao)] },
    select: { id: true, titulo: true, sistemaSlug: true, ativo: true, tipo: true },
  })
  if (!documento?.ativo) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

  const passoInformado = corpo?.passo !== undefined && corpo.passo !== null
  let passoNumero: number | null = null
  let passoTitulo: string | null = null
  if (passoInformado) {
    const passo = corpo?.passo
    const tituloPasso = typeof corpo?.tituloPasso === 'string' ? corpo.tituloPasso.trim() : ''
    if (
      documento.tipo !== 'PASSO_A_PASSO'
      || !Number.isInteger(passo)
      || (passo as number) < 1
      || (passo as number) > MAX_PASSOS_DOCUMENTO
      || !tituloPasso
      || tituloPasso.length > LIMITE_TITULO_PASSO
    ) {
      return NextResponse.json({ error: 'Passo inválido.' }, { status: 400 })
    }
    const salvo = await prisma.passoDocumento.findUnique({
      where: { documentoId_ordem: { documentoId: documento.id, ordem: (passo as number) - 1 } },
      select: { titulo: true },
    })
    if (!salvo || salvo.titulo !== tituloPasso) {
      return NextResponse.json({ error: 'Este passo foi alterado. Recarregue a página e tente de novo.' }, { status: 409 })
    }
    passoNumero = passo as number
    passoTitulo = salvo.titulo
  } else if (corpo?.tituloPasso !== undefined) {
    return NextResponse.json({ error: 'Passo inválido.' }, { status: 400 })
  }

  const relato = await prisma.relatoDocumento.create({
    data: {
      documentoId: documento.id,
      tituloDocumento: documento.titulo,
      sistemaSlug: documento.sistemaSlug,
      autorId: sessao.id,
      autorNome: sessao.nome,
      mensagem,
      passoNumero,
      passoTitulo,
    },
  })
  await registrarAuditoria({
    ator: sessao,
    acao: 'criar',
    entidade: 'RelatoDocumento',
    entidadeId: relato.id,
    descricao: `${sessao.nome} relatou um problema em "${documento.titulo}"${passoNumero ? ` (passo ${passoNumero})` : ''}`,
  })
  return NextResponse.json({ ok: true, id: relato.id }, { status: 201 })
}
