// src/app/api/definir-senha/route.ts — primeira troca de senha (temporária → definitiva)
//
// Não pede a senha atual — o colaborador chegou aqui autenticado com a senha
// temporária que o admin gerou. Por isso só aceita quando mustChangePassword
// ainda é true no banco: sem essa trava, esta rota viraria um jeito de trocar
// a senha sem saber a atual a qualquer momento.

import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { exigirSessaoApi } from '@/lib/auth/api'
import { assinarToken, COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS } from '@/lib/auth/jwt'
import { registrarAuditoria } from '@/lib/audit'
import { marcaCredencial } from '@/lib/auth/credencial'
import { lerJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const corpo = await lerJsonLimitado(req) as Record<string, unknown> | null
  const novaSenha = corpo?.novaSenha

  if (typeof novaSenha !== 'string' || novaSenha.length < 8 || novaSenha.length > 72) {
    return NextResponse.json({ error: 'A nova senha precisa ter entre 8 e 72 caracteres.' }, { status: 400 })
  }

  const colaborador = await prisma.colaborador.findUnique({ where: { id: sessao.id } })
  if (!colaborador) {
    return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  }
  if (!colaborador.mustChangePassword) {
    return NextResponse.json(
      { error: 'Sua senha já foi definida. Use Minha conta para trocá-la.' },
      { status: 400 }
    )
  }

  const senhaHash = await bcrypt.hash(novaSenha, 10)
  await prisma.colaborador.update({
    where: { id: colaborador.id },
    data: { senhaHash, mustChangePassword: false, resetToken: null, resetTokenExpiry: null },
  })

  await registrarAuditoria({
    ator: sessao,
    acao: 'editar',
    entidade: 'Colaborador',
    entidadeId: colaborador.id,
    descricao: `${colaborador.nome} definiu a senha definitiva`,
  })

  // Reassina o cookie com mustChangePassword: false — sem isto o proxy
  // continuaria travando o colaborador em /definir-senha até o token expirar.
  const token = await assinarToken({
    id: colaborador.id,
    sessaoId: sessao.sessaoId,
    email: colaborador.email,
    nome: colaborador.nome,
    papel: sessao.papel,
    credencial: marcaCredencial(senhaHash),
    mustChangePassword: false,
  })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
    path: '/',
  })
  return res
}
