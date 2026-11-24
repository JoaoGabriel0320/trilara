import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { revalidateTag } from 'next/cache'
import { TAG_DEPARTAMENTO_COLABORADOR } from '@/lib/portal-cache'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

type Contexto = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const { id } = await params
  const corpo = await lerObjetoJsonLimitado(req)
  if (!corpo || (typeof corpo.ativo !== 'boolean' && typeof corpo.nome !== 'string')) return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  const atual = await prisma.departamento.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 404 })

  if (typeof corpo.nome === 'string') {
    const nome = corpo.nome.trim()
    if (!nome || nome.length > 120) return NextResponse.json({ error: 'Informe o nome do departamento (até 120 caracteres).' }, { status: 400 })
    if (nome === atual.nome) return NextResponse.json({ ok: true })
    try {
      await prisma.$transaction(async (tx) => {
        await tx.departamento.update({ where: { id }, data: { nome } })
        await tx.colaborador.updateMany({ where: { departamento: atual.nome }, data: { departamento: nome } })
        await tx.solicitacaoAcesso.updateMany({ where: { departamento: atual.nome }, data: { departamento: nome } })
      })
      revalidateTag(TAG_DEPARTAMENTO_COLABORADOR, 'max')
      await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Departamento', entidadeId: id, descricao: `${sessao.nome} renomeou o departamento ${atual.nome} para ${nome}` })
      return NextResponse.json({ ok: true })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ error: 'Já existe um departamento com este nome.' }, { status: 409 })
      return NextResponse.json({ error: 'Não foi possível editar o departamento.' }, { status: 500 })
    }
  }

  if (typeof corpo.ativo !== 'boolean') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  await prisma.departamento.update({ where: { id }, data: { ativo: corpo.ativo } })
  await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Departamento', entidadeId: id, descricao: `${sessao.nome} ${corpo.ativo ? 'ativou' : 'desativou'} o departamento ${atual.nome}` })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const { id } = await params
  const atual = await prisma.departamento.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Departamento não encontrado.' }, { status: 404 })
  const [colaboradores, solicitacoes] = await Promise.all([
    prisma.colaborador.count({ where: { departamento: atual.nome } }),
    prisma.solicitacaoAcesso.count({ where: { departamento: atual.nome } }),
  ])
  if (colaboradores || solicitacoes) return NextResponse.json({ error: `Este departamento está vinculado a ${colaboradores} colaborador(es) e ${solicitacoes} solicitação(ões). Desative-o ou altere os vínculos antes de excluir.` }, { status: 409 })
  await prisma.departamento.delete({ where: { id } })
  await registrarAuditoria({ ator: sessao, acao: 'excluir', entidade: 'Departamento', entidadeId: id, descricao: `${sessao.nome} excluiu o departamento ${atual.nome}` })
  return NextResponse.json({ ok: true })
}
