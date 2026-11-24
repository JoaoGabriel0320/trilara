import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro
  const corpo = await lerObjetoJsonLimitado(req)
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : ''
  if (!nome || nome.length > 120) return NextResponse.json({ error: 'Informe o nome da filial (até 120 caracteres).' }, { status: 400 })
  try {
    const filial = await prisma.filial.create({ data: { nome } })
    await registrarAuditoria({ ator: sessao, acao: 'criar', entidade: 'Filial', entidadeId: filial.id, descricao: `${sessao.nome} cadastrou a filial ${nome}` })
    return NextResponse.json({ filial }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return NextResponse.json({ error: 'Esta filial já está cadastrada.' }, { status: 409 })
    return NextResponse.json({ error: 'Não foi possível cadastrar a filial.' }, { status: 500 })
  }
}
