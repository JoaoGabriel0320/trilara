// src/app/api/conta/senha/route.ts — colaborador troca a própria senha

import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { exigirSessaoApi } from '@/lib/auth/api'
import { registrarAuditoria } from '@/lib/audit'
import { assinarToken, COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS } from '@/lib/auth/jwt'
import { marcaCredencial } from '@/lib/auth/credencial'
import { lerJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { sessao, erro } = await exigirSessaoApi()
  if (erro) return erro

  const corpo = await lerJsonLimitado(req) as Record<string, unknown> | null
  const senhaAtual = corpo?.senhaAtual
  const novaSenha = corpo?.novaSenha

  if (!senhaAtual || !novaSenha) {
    return NextResponse.json({ error: 'Preencha a senha atual e a nova senha.' }, { status: 400 })
  }
  if (typeof senhaAtual !== 'string' || senhaAtual.length > 72 || typeof novaSenha !== 'string' || novaSenha.length < 8 || novaSenha.length > 72) {
    return NextResponse.json({ error: 'A nova senha precisa ter entre 8 e 72 caracteres.' }, { status: 400 })
  }

  const colaborador = await prisma.colaborador.findUnique({ where: { id: sessao.id } })
  if (!colaborador) {
    return NextResponse.json({ error: 'Colaborador não encontrado.' }, { status: 404 })
  }

  const confere = await bcrypt.compare(senhaAtual, colaborador.senhaHash)
  if (!confere) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 })
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
    descricao: `${colaborador.nome} trocou a própria senha`,
  })

  const token = await assinarToken({
    id: colaborador.id,
    sessaoId: sessao.sessaoId,
    email: colaborador.email,
    nome: colaborador.nome,
    papel: colaborador.papel,
    mustChangePassword: false,
    credencial: marcaCredencial(senhaHash),
  })
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
    path: '/',
  })
  return resposta
}
