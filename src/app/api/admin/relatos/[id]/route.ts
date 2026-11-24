import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdminApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const corpo = await lerObjetoJsonLimitado(req)
  if (corpo?.status !== 'ABERTO' && corpo?.status !== 'RESOLVIDO') {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }
  const relato = await prisma.relatoDocumento.findUnique({ where: { id } })
  if (!relato) return NextResponse.json({ error: 'Relato não encontrado.' }, { status: 404 })
  if (relato.status === corpo.status) return NextResponse.json({ ok: true })

  await prisma.relatoDocumento.update({
    where: { id },
    data: {
      status: corpo.status,
      resolvidoPor: corpo.status === 'RESOLVIDO' ? sessao.nome : null,
      resolvidoEm: corpo.status === 'RESOLVIDO' ? new Date() : null,
    },
  })
  await registrarAuditoria({
    ator: sessao, acao: 'editar', entidade: 'RelatoDocumento', entidadeId: id,
    descricao: `${sessao.nome} ${corpo.status === 'RESOLVIDO' ? 'resolveu' : 'reabriu'} o relato sobre "${relato.tituloDocumento}"`,
  })
  return NextResponse.json({ ok: true })
}
