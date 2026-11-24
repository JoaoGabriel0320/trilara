import { NextResponse, type NextRequest } from 'next/server'
import { Prisma, type Papel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const { id } = await params
  const corpo = await lerObjetoJsonLimitado(req)
  const decisao = corpo?.decisao
  if (!corpo) return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  if (decisao !== 'APROVADA' && decisao !== 'REPROVADA') return NextResponse.json({ error: 'Decisão inválida.' }, { status: 400 })
  const papeis = ['COLABORADOR', 'EDITOR', 'ADMIN'] as const
  if (decisao === 'APROVADA' && !papeis.some((papel) => papel === corpo.papel)) return NextResponse.json({ error: 'Selecione um nível de acesso válido.' }, { status: 400 })
  if (decisao === 'APROVADA' && corpo.identidadeConfirmada !== true) {
    return NextResponse.json({ error: 'Confirme a identidade por um canal confiável antes de aprovar.' }, { status: 400 })
  }
  try {
    const solicitacao = await prisma.$transaction(async (tx) => {
      const atual = await tx.solicitacaoAcesso.findUnique({ where: { id }, include: { filial: true } })
      if (!atual || atual.status !== 'PENDENTE') return null
      if (decisao === 'APROVADA' && atual.tipoAcesso === 'EXTERNO' && corpo.papel !== 'COLABORADOR') {
        throw new Error('PAPEL_EXTERNO_INVALIDO')
      }
      if (decisao === 'APROVADA' && atual.tipoAcesso === 'EXTERNO' && !atual.empresaNome?.trim()) {
        throw new Error('EMPRESA_EXTERNA_AUSENTE')
      }
      const claimed = await tx.solicitacaoAcesso.updateMany({ where: { id, status: 'PENDENTE' }, data: { status: decisao, decididaEm: new Date(), decididaPorId: sessao.id } })
      if (claimed.count !== 1) return null
      if (decisao === 'APROVADA') {
        await tx.colaborador.create({ data: { nome: atual.nome, email: atual.email, senhaHash: atual.senhaHash, tipoAcesso: atual.tipoAcesso, empresaNome: atual.tipoAcesso === 'EXTERNO' ? atual.empresaNome : null, departamento: atual.tipoAcesso === 'INTERNO' ? atual.departamento : null, filialNome: atual.tipoAcesso === 'INTERNO' ? atual.filial?.nome : null, papel: atual.tipoAcesso === 'EXTERNO' ? 'COLABORADOR' : corpo.papel as Papel, ativo: true } })
      }
      await tx.solicitacaoAcesso.delete({ where: { id } })
      return atual
    })
    if (!solicitacao) return NextResponse.json({ error: 'Solicitação já decidida ou não encontrada.' }, { status: 409 })
    await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'SolicitacaoAcesso', entidadeId: id, descricao: `${sessao.nome} ${decisao === 'APROVADA' ? `confirmou manualmente a identidade e aprovou o acesso ${corpo.papel}` : 'reprovou o acesso'} de ${solicitacao.email}` })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Error && e.message === 'PAPEL_EXTERNO_INVALIDO') return NextResponse.json({ error: 'Contas externas têm acesso somente de leitura.' }, { status: 400 })
    if (e instanceof Error && e.message === 'EMPRESA_EXTERNA_AUSENTE') return NextResponse.json({ error: 'A solicitação externa precisa informar a empresa.' }, { status: 400 })
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ error: 'Este e-mail já possui uma conta. A solicitação continua pendente.' }, { status: 409 })
    return NextResponse.json({ error: 'Não foi possível decidir a solicitação.' }, { status: 500 })
  }
}
