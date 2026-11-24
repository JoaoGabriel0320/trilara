import { publicoValido, emailValido } from '@/lib/publico'
// src/app/api/admin/usuarios/route.ts — criação de colaborador

import { NextResponse, type NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { exigirAdminApi } from '@/lib/auth/api'
import { gerarSenhaTemporaria } from '@/lib/senha'
import { registrarAuditoria } from '@/lib/audit'
import { emailCorporativo } from '@/lib/email-corporativo'
import { lerObjetoJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

const PAPEIS = ['COLABORADOR', 'EDITOR', 'ADMIN'] as const

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirAdminApi()
  if (erro) return erro

  const corpo = await lerObjetoJsonLimitado(req)
  const tipoAcesso = corpo?.tipoAcesso ?? 'INTERNO'
  const empresaNome = typeof corpo?.empresaNome === 'string' ? corpo.empresaNome.trim() : ''
  if (!publicoValido(tipoAcesso)) return NextResponse.json({ error: 'Tipo de acesso inválido.' }, { status: 400 })
  const externo = tipoAcesso === 'EXTERNO'
  if (empresaNome.length > 160 || (externo && !empresaNome)) return NextResponse.json({ error: 'Informe a empresa (até 160 caracteres).' }, { status: 400 })
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : ''
  const email = (externo ? emailValido(corpo?.email) : emailCorporativo(corpo?.email))
  const departamento = typeof corpo?.departamento === 'string' ? corpo.departamento.trim() : ''
  const filialNome = typeof corpo?.filialNome === 'string' ? corpo.filialNome.trim() : ''
  const papel = corpo?.papel

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
  if (!PAPEIS.some((opcao) => opcao === papel)) {
    return NextResponse.json({ error: 'Selecione um papel válido.' }, { status: 400 })
  }

  // A senha temporária só existe em texto puro por um instante: nasce aqui,
  // vai pro hash, e a única cópia em claro volta na resposta HTTP pro admin
  // copiar. Não é logada nem gravada em lugar nenhum.
  const senhaTemporaria = gerarSenhaTemporaria()
  const senhaHash = await bcrypt.hash(senhaTemporaria, 10)

  try {
    const colaborador = await prisma.colaborador.create({
      data: {
        nome,
        email,
        senhaHash,
        tipoAcesso,
        empresaNome: externo ? empresaNome : null,
        departamento: externo ? null : departamento || null,
        filialNome: externo ? null : filialNome || null,
        papel: papel as (typeof PAPEIS)[number],
        ativo: true,
        mustChangePassword: true,
      },
    })

    await registrarAuditoria({
      ator: sessao,
      acao: 'criar',
      entidade: 'Colaborador',
      entidadeId: colaborador.id,
      descricao: `${sessao.nome} criou o colaborador ${colaborador.nome} (${colaborador.papel})`,
    })

    return NextResponse.json({ ok: true, id: colaborador.id, senhaTemporaria }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Já existe um colaborador com este e-mail.' }, { status: 409 })
    }
    console.error('[admin/usuarios] falha ao criar', e)
    return NextResponse.json({ error: 'Não foi possível criar o colaborador.' }, { status: 500 })
  }
}
