import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { exigirAdminApi } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { listarSistemasAdmin } from '@/lib/sistemas'
import { validarSistema } from '@/lib/sistema-cadastro'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const corpo = await lerObjetoJsonLimitado(req, 64 * 1024)
  const sistemas = await listarSistemasAdmin()
  const { sistema, erro: erroDados } = validarSistema(corpo, undefined, sistemas.filter((item) => item.ativo).map((item) => item.sistema.slug))
  if (!sistema) return NextResponse.json({ error: erroDados }, { status: 400 })
  if (sistemas.some((item) => item.sistema.slug === sistema.slug)) {
    return NextResponse.json({ error: 'Este identificador já está em uso.' }, { status: 409 })
  }
  try {
    await prisma.sistemaCadastro.create({ data: { slug: sistema.slug, dados: JSON.parse(JSON.stringify(sistema)) as Prisma.InputJsonValue } })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Este identificador já está em uso.' }, { status: 409 })
    }
    throw error
  }
  await registrarAuditoria({ ator: sessao, acao: 'criar', entidade: 'Sistema', entidadeId: sistema.slug, descricao: `${sessao.nome} cadastrou o sistema ${sistema.name}` })
  return NextResponse.json({ ok: true }, { status: 201 })
}
