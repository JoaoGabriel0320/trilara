// src/app/api/lab/[id]/route.ts — editar / mudar status / excluir uma ideia
//
// Duas trilhas de permissão nesta rota:
// - Conteúdo (título, resumo, texto, sistema): autor OU administrador.
// - Status (mover para "Em análise", "Aprovada"...): só administrador — é
//   avaliação de outra pessoa sobre a ideia, o autor não se autoaprova.

import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirInternoApi } from '@/lib/auth/api'
import { souAdmin } from '@/lib/auth/jwt'
import { slugDeSistemaValido } from '@/lib/sistemas'
import { registrarAuditoria } from '@/lib/audit'
import { ORDEM_STATUS } from '@/lib/ideias'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.ideia.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Ideia não encontrada.' }, { status: 404 })

  const corpo = await lerObjetoJsonLimitado(req)
  if (!corpo) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  const ehAutor = atual.autorId === sessao.id
  const ehEditor = souAdmin(sessao.papel)

  // Atalho da listagem/detalhe: PATCH só com `status`.
  if (Object.keys(corpo).length === 1 && typeof corpo.status === 'string') {
    if (!ehEditor) {
      return NextResponse.json({ error: 'Só administradores alteram o status de uma ideia.' }, { status: 403 })
    }
    if (!ORDEM_STATUS.some((status) => status === corpo.status)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
    }
    await prisma.ideia.update({ where: { id }, data: { status: corpo.status as (typeof ORDEM_STATUS)[number] } })
    await registrarAuditoria({
      ator: sessao,
      acao: 'editar',
      entidade: 'Ideia',
      entidadeId: id,
      descricao: `${sessao.nome} moveu "${atual.titulo}" para ${corpo.status}`,
    })
    return NextResponse.json({ ok: true, status: corpo.status })
  }

  if (!ehAutor && !ehEditor) {
    return NextResponse.json({ error: 'Só o autor ou um administrador pode alterar esta ideia.' }, { status: 403 })
  }

  const titulo = typeof corpo.titulo === 'string' ? corpo.titulo.trim() : ''
  const resumo = typeof corpo.resumo === 'string' ? corpo.resumo.trim() : ''
  const conteudo = typeof corpo.conteudo === 'string' ? corpo.conteudo.trim() : ''
  const sistemaSlug = typeof corpo.sistemaSlug === 'string' ? corpo.sistemaSlug.trim() || undefined : undefined

  if (!titulo || titulo.length > 160) return NextResponse.json({ error: 'Dê um título de até 160 caracteres para a ideia.' }, { status: 400 })
  if (!resumo || resumo.length > 300) return NextResponse.json({ error: 'Escreva um resumo de até 300 caracteres.' }, { status: 400 })
  if (!conteudo || conteudo.length > 10000) return NextResponse.json({ error: 'Descreva a ideia em até 10.000 caracteres.' }, { status: 400 })
  if (sistemaSlug && !(await slugDeSistemaValido(sistemaSlug))) {
    return NextResponse.json({ error: 'Sistema inválido.' }, { status: 400 })
  }

  await prisma.ideia.update({
    where: { id },
    data: { titulo, resumo, conteudo, sistemaSlug: sistemaSlug ?? null },
  })

  await registrarAuditoria({
    ator: sessao,
    acao: 'editar',
    entidade: 'Ideia',
    entidadeId: id,
    descricao: `${sessao.nome} editou a ideia "${titulo}"`,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirInternoApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.ideia.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Ideia não encontrada.' }, { status: 404 })

  if (atual.autorId !== sessao.id && !souAdmin(sessao.papel)) {
    return NextResponse.json({ error: 'Só o autor ou um administrador pode excluir esta ideia.' }, { status: 403 })
  }

  await prisma.ideia.delete({ where: { id } })

  await registrarAuditoria({
    ator: sessao,
    acao: 'excluir',
    entidade: 'Ideia',
    entidadeId: id,
    descricao: `${sessao.nome} excluiu a ideia "${atual.titulo}"`,
  })

  return NextResponse.json({ ok: true })
}
