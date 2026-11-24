// src/app/api/admin/categorias/[id]/route.ts — renomear, ativar/desativar e excluir uma seção
//
// Diferente de Departamento (que guarda o nome como string solta em
// Colaborador/SolicitacaoAcesso, exigindo sincronizar as duas tabelas),
// Documento.categoriaId é uma FK de verdade com onDelete: SetNull — renomear
// não precisa tocar em Documento (o join já reflete o nome novo), e excluir
// não deixa nada quebrado: os documentos só caem de volta pro grupo "Geral".

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
  if (!corpo || (typeof corpo.ativo !== 'boolean' && typeof corpo.nome !== 'string')) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }

  const atual = await prisma.categoria.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Seção não encontrada.' }, { status: 404 })

  if (typeof corpo.nome === 'string') {
    const nome = corpo.nome.trim()
    if (!nome || nome.length > 120) {
      return NextResponse.json({ error: 'Informe o nome da seção (até 120 caracteres).' }, { status: 400 })
    }
    if (nome === atual.nome) return NextResponse.json({ ok: true })
    try {
      await prisma.categoria.update({ where: { id }, data: { nome } })
      await registrarAuditoria({
        ator: sessao,
        acao: 'editar',
        entidade: 'Categoria',
        entidadeId: id,
        descricao: `${sessao.nome} renomeou a seção "${atual.nome}" para "${nome}" em ${atual.sistemaSlug}`,
      })
      return NextResponse.json({ ok: true })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'Já existe uma seção com esse nome neste sistema.' }, { status: 409 })
      }
      console.error('[admin/categorias] falha ao editar', e)
      return NextResponse.json({ error: 'Não foi possível editar a seção.' }, { status: 500 })
    }
  }

  if (typeof corpo.ativo !== 'boolean') return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  await prisma.categoria.update({ where: { id }, data: { ativo: corpo.ativo } })
  await registrarAuditoria({
    ator: sessao,
    acao: 'editar',
    entidade: 'Categoria',
    entidadeId: id,
    descricao: `${sessao.nome} ${corpo.ativo ? 'ativou' : 'desativou'} a seção "${atual.nome}" em ${atual.sistemaSlug}`,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Contexto) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.categoria.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Seção não encontrada.' }, { status: 404 })

  // Não bloqueia por ter documento vinculado — onDelete: SetNull do schema já
  // garante que eles só voltam pro grupo "Geral", sem registro órfão.
  await prisma.categoria.delete({ where: { id } })
  await registrarAuditoria({
    ator: sessao,
    acao: 'excluir',
    entidade: 'Categoria',
    entidadeId: id,
    descricao: `${sessao.nome} excluiu a seção "${atual.nome}" de ${atual.sistemaSlug}`,
  })
  return NextResponse.json({ ok: true })
}
