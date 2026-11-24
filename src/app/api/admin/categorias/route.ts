// src/app/api/admin/categorias/route.ts — criar seção dentro de um sistema

import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { registrarAuditoria } from '@/lib/audit'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const corpo = await lerObjetoJsonLimitado(req)
  const sistemaSlug = typeof corpo?.sistemaSlug === 'string' ? corpo.sistemaSlug : ''
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : ''

  if (!sistemaSlug || !(await slugDeSistemaValido(sistemaSlug))) {
    return NextResponse.json({ error: 'Sistema inválido.' }, { status: 400 })
  }
  if (!nome || nome.length > 120) {
    return NextResponse.json({ error: 'Informe o nome da seção (até 120 caracteres).' }, { status: 400 })
  }

  try {
    const categoria = await prisma.categoria.create({ data: { sistemaSlug, nome } })
    await registrarAuditoria({
      ator: sessao,
      acao: 'criar',
      entidade: 'Categoria',
      entidadeId: categoria.id,
      descricao: `Criou a seção "${nome}" em ${sistemaSlug}`,
    })
    return NextResponse.json({ ok: true, id: categoria.id, nome: categoria.nome }, { status: 201 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe uma seção com esse nome.' }, { status: 409 })
    }
    console.error('[admin/categorias] falha ao criar', e)
    return NextResponse.json({ error: 'Não foi possível criar a seção.' }, { status: 500 })
  }
}
