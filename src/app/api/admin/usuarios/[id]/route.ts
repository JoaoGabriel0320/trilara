import { publicoValido, emailValido } from '@/lib/publico'
// src/app/api/admin/usuarios/[id]/route.ts — editar colaborador / ativar-desativar

import { NextResponse, type NextRequest } from 'next/server'
import { revalidateTag } from 'next/cache'
import { Prisma, type Papel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { TAG_DEPARTAMENTO_COLABORADOR } from '@/lib/portal-cache'
import { emailCorporativo } from '@/lib/email-corporativo'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

const PAPEIS = ['COLABORADOR', 'EDITOR', 'ADMIN'] as const

async function ultimoAdminAtivo(idExcluido: string): Promise<boolean> {
  const outrosAdminsAtivos = await prisma.colaborador.count({
    where: { papel: 'ADMIN', ativo: true, id: { not: idExcluido } },
  })
  return outrosAdminsAtivos === 0
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const { id } = await params
  const atual = await prisma.colaborador.findUnique({ where: { id } })
  if (!atual) return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  if (atual.adminProtegido && id !== sessao.id) {
    return NextResponse.json({ error: 'Esta conta administrativa é protegida.' }, { status: 403 })
  }

  const corpo = await lerObjetoJsonLimitado(req)
  if (!corpo) return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })

  // Alternar ativo/inativo é um PATCH só com essa chave — atalho usado pela listagem.
  if (Object.keys(corpo).length === 1 && typeof corpo.ativo === 'boolean') {
    if (!corpo.ativo) {
      if (atual.adminProtegido) {
        return NextResponse.json({ error: 'Esta conta administrativa não pode ser desativada.' }, { status: 403 })
      }
      if (id === sessao.id) {
        return NextResponse.json({ error: 'Você não pode desativar sua própria conta.' }, { status: 400 })
      }
      if (atual.papel === 'ADMIN' && (await ultimoAdminAtivo(id))) {
        return NextResponse.json(
          { error: 'Este é o único administrador ativo. Promova outro colaborador antes de desativá-lo.' },
          { status: 400 }
        )
      }
    }
    const alteracao = await prisma.colaborador.updateMany({
      where: { id, adminProtegido: false },
      data: { ativo: corpo.ativo },
    })
    if (alteracao.count !== 1) {
      return NextResponse.json({ error: 'Esta conta administrativa é protegida.' }, { status: 403 })
    }
    await registrarAuditoria({
      ator: sessao,
      acao: corpo.ativo ? 'editar' : 'excluir',
      entidade: 'Colaborador',
      entidadeId: id,
      descricao: `${sessao.nome} ${corpo.ativo ? 'reativou' : 'desativou'} ${atual.nome}`,
    })
    return NextResponse.json({ ok: true, ativo: corpo.ativo })
  }

  // Edição completa dos dados cadastrais.
  const tipoAcesso = corpo.tipoAcesso ?? atual.tipoAcesso
  const empresaNome = typeof corpo.empresaNome === 'string' ? corpo.empresaNome.trim() : atual.empresaNome ?? ''
  if (!publicoValido(tipoAcesso)) return NextResponse.json({ error: 'Tipo de acesso inválido.' }, { status: 400 })
  const externo = tipoAcesso === 'EXTERNO'
  if (empresaNome.length > 160 || (externo && !empresaNome)) return NextResponse.json({ error: 'Informe a empresa (até 160 caracteres).' }, { status: 400 })
  if (externo && (atual.adminProtegido || id === sessao.id)) return NextResponse.json({ error: 'Esta conta administrativa deve permanecer interna.' }, { status: 400 })
  const nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : ''
  const email = (externo ? emailValido(corpo.email) : emailCorporativo(corpo.email))
  const departamento = typeof corpo.departamento === 'string' ? corpo.departamento.trim() : ''
  const filialNome = typeof corpo.filialNome === 'string' ? corpo.filialNome.trim() : ''
  const papel = typeof corpo.papel === 'string' && PAPEIS.some((opcao) => opcao === corpo.papel) ? corpo.papel as Papel : undefined

  if (!email) return NextResponse.json({ error: externo ? 'Informe um e-mail válido.' : 'Informe um e-mail válido.' }, { status: 400 })
  if (externo && papel !== 'COLABORADOR') return NextResponse.json({ error: 'Contas externas têm acesso somente de leitura.' }, { status: 400 })
  if (!externo && (!filialNome || !(await prisma.filial.findFirst({ where: { nome: filialNome, ativa: true } })))) {
    return NextResponse.json({ error: 'Selecione uma filial ativa.' }, { status: 400 })
  }
  if (!externo && (!departamento || !(await prisma.departamento.findFirst({ where: { nome: departamento, ativo: true } })))) {
    return NextResponse.json({ error: 'Selecione um departamento ativo.' }, { status: 400 })
  }

  if (!nome || nome.length > 120) return NextResponse.json({ error: 'Informe o nome do colaborador (até 120 caracteres).' }, { status: 400 })
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
  }
  if (!papel || !PAPEIS.includes(papel)) {
    return NextResponse.json({ error: 'Selecione um papel válido.' }, { status: 400 })
  }
  if (atual.adminProtegido && papel !== 'ADMIN') {
    return NextResponse.json({ error: 'O papel desta conta administrativa é protegido.' }, { status: 403 })
  }
  if (id === sessao.id && papel !== 'ADMIN') {
    return NextResponse.json({ error: 'Você não pode remover o próprio papel de administrador.' }, { status: 400 })
  }
  if (atual.papel === 'ADMIN' && papel !== 'ADMIN' && (await ultimoAdminAtivo(id))) {
    return NextResponse.json(
      { error: 'Este é o único administrador ativo. Promova outro colaborador antes de rebaixá-lo.' },
      { status: 400 }
    )
  }

  try {
    const alteracao = await prisma.colaborador.updateMany({
      where: { id, ...(id !== sessao.id || papel !== 'ADMIN' ? { adminProtegido: false } : {}) },
      data: { nome, email, tipoAcesso, empresaNome: externo ? empresaNome : null, departamento: externo ? null : departamento || null, filialNome: externo ? null : filialNome, papel, ...(email !== atual.email ? { resetToken: null, resetTokenExpiry: null } : {}) },
    })
    if (alteracao.count !== 1) {
      return NextResponse.json({ error: 'Esta conta administrativa é protegida.' }, { status: 403 })
    }
    if (tipoAcesso !== atual.tipoAcesso) {
      await prisma.sessaoColaborador.updateMany({ where: { colaboradorId: id }, data: { expiraEm: new Date() } })
    }
    await registrarAuditoria({
      ator: sessao,
      acao: 'editar',
      entidade: 'Colaborador',
      entidadeId: id,
      descricao: `${sessao.nome} editou o cadastro de ${nome}`,
    })
    revalidateTag(TAG_DEPARTAMENTO_COLABORADOR, 'max')
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um colaborador com este e-mail.' }, { status: 409 })
    }
    console.error('[admin/usuarios] falha ao editar', e)
    return NextResponse.json({ error: 'Não foi possível salvar as alterações.' }, { status: 500 })
  }
}
