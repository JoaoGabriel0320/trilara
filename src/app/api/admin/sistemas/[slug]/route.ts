import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { exigirAdminApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { listarSistemasAdmin } from '@/lib/sistemas'
import { validarSistema } from '@/lib/sistema-cadastro'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

type Contexto = { params: Promise<{ slug: string }> }

export async function PATCH(req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const { slug } = await params
  const sistemas = await listarSistemasAdmin()
  const atual = sistemas.find((item) => item.sistema.slug === slug)
  if (!atual) return NextResponse.json({ error: 'Sistema não encontrado.' }, { status: 404 })
  const corpo = await lerObjetoJsonLimitado(req, 64 * 1024)
  if (corpo && typeof corpo === 'object' && 'ativo' in corpo && typeof corpo.ativo === 'boolean') {
    await prisma.sistemaCadastro.upsert({
      where: { slug },
      create: { slug, dados: JSON.parse(JSON.stringify(atual.sistema)) as Prisma.InputJsonValue, ativo: corpo.ativo },
      update: { ativo: corpo.ativo },
    })
    await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Sistema', entidadeId: slug, descricao: `${sessao.nome} ${corpo.ativo ? 'restaurou' : 'arquivou'} o sistema ${atual.sistema.name}` })
    return NextResponse.json({ ok: true })
  }
  const { sistema, erro: erroDados } = validarSistema(corpo, slug, sistemas.filter((item) => item.ativo).map((item) => item.sistema.slug))
  if (!sistema) return NextResponse.json({ error: erroDados }, { status: 400 })
  if (corpo && !Object.hasOwn(corpo, 'ecossistema') && atual.sistema.ecossistema) {
    sistema.ecossistema = atual.sistema.ecossistema
  }
  await prisma.sistemaCadastro.upsert({
    where: { slug },
    create: { slug, dados: JSON.parse(JSON.stringify(sistema)) as Prisma.InputJsonValue, ativo: atual.ativo },
    update: { dados: JSON.parse(JSON.stringify(sistema)) as Prisma.InputJsonValue },
  })
  await registrarAuditoria({ ator: sessao, acao: 'editar', entidade: 'Sistema', entidadeId: slug, descricao: `${sessao.nome} editou o sistema ${sistema.name}` })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const { slug } = await params
  const atual = (await listarSistemasAdmin()).find((item) => item.sistema.slug === slug)
  if (!atual) return NextResponse.json({ error: 'Sistema não encontrado.' }, { status: 404 })
  await prisma.sistemaCadastro.upsert({
    where: { slug },
    create: { slug, dados: JSON.parse(JSON.stringify(atual.sistema)) as Prisma.InputJsonValue, ativo: false },
    update: { ativo: false },
  })
  await registrarAuditoria({ ator: sessao, acao: 'excluir', entidade: 'Sistema', entidadeId: slug, descricao: `${sessao.nome} arquivou o sistema ${atual.sistema.name}` })
  return NextResponse.json({ ok: true })
}
