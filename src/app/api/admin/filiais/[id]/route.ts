import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const corpo = await lerObjetoJsonLimitado(req)
  if (!corpo || (typeof corpo.ativa !== 'boolean' && typeof corpo.nome !== 'string')) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const filial = await prisma.filial.findUnique({ where: { id } })
  if (!filial) return NextResponse.json({ error: 'Filial não encontrada.' }, { status: 404 })

  if (typeof corpo.nome === 'string') {
    const nome = corpo.nome.trim()
    if (!nome || nome.length > 120) {
      return NextResponse.json({ error: 'Informe o nome da filial (até 120 caracteres).' }, { status: 400 })
    }
    if (nome === filial.nome) return NextResponse.json({ ok: true })

    try {
      await prisma.$transaction(async (tx) => {
        await tx.filial.update({ where: { id }, data: { nome } })
        await tx.colaborador.updateMany({ where: { filialNome: filial.nome }, data: { filialNome: nome } })
      })
      await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Filial', entidadeId: id, descricao: `${sessao.nome} renomeou a filial ${filial.nome} para ${nome}` })
      return NextResponse.json({ ok: true })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'Já existe uma filial com este nome.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Não foi possível editar a filial.' }, { status: 500 })
    }
  }

  if (typeof corpo.ativa !== 'boolean') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  await prisma.filial.update({ where: { id }, data: { ativa: corpo.ativa } })
  await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Filial', entidadeId: id, descricao: `${sessao.nome} ${corpo.ativa ? 'ativou' : 'desativou'} a filial ${filial.nome}` })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const filial = await prisma.filial.findUnique({ where: { id }, select: { nome: true } })
  if (!filial) return NextResponse.json({ error: 'Filial não encontrada.' }, { status: 404 })

  const [colaboradores, solicitacoes] = await Promise.all([
    prisma.colaborador.count({ where: { filialNome: filial.nome } }),
    prisma.solicitacaoAcesso.count({ where: { filialId: id } }),
  ])
  if (colaboradores || solicitacoes) {
    return NextResponse.json({ error: `Esta filial está vinculada a ${colaboradores} colaborador(es) e ${solicitacoes} solicitação(ões). Desative-a ou altere os vínculos antes de excluir.` }, { status: 409 })
  }

  try {
    await prisma.filial.delete({ where: { id } })
    await registrarAuditoria({ ator: sessao, acao: 'excluir', entidade: 'Filial', entidadeId: id, descricao: `${sessao.nome} excluiu a filial ${filial.nome}` })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      return NextResponse.json({ error: 'A filial recebeu uma solicitação de acesso. Desative-a em vez de excluir.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Não foi possível excluir a filial.' }, { status: 500 })
  }
}
