import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { COOKIE_SESSAO } from '@/lib/auth/jwt'
import { hashTokenReset, tokenResetValido } from '@/lib/reset-senha'
import { registrarAuditoria } from '@/lib/audit'
import { lerJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const corpo = await lerJsonLimitado(req) as Record<string, unknown> | null
  const token = corpo?.token
  const novaSenha = corpo?.novaSenha
  if (!tokenResetValido(token)) return NextResponse.json({ error: 'Link inválido ou expirado. Solicite outro.' }, { status: 400 })
  if (typeof novaSenha !== 'string' || novaSenha.length < 8 || novaSenha.length > 72) {
    return NextResponse.json({ error: 'A senha deve ter entre 8 e 72 caracteres.' }, { status: 400 })
  }

  const hash = hashTokenReset(token)
  const colaborador = await prisma.colaborador.findFirst({
    where: { resetToken: hash, resetTokenExpiry: { gt: new Date() }, ativo: true },
    select: { id: true, nome: true, email: true },
  })
  if (!colaborador) return NextResponse.json({ error: 'Link inválido ou expirado. Solicite outro.' }, { status: 400 })

  const senhaHash = await bcrypt.hash(novaSenha, 10)
  const resultado = await prisma.colaborador.updateMany({
    where: { id: colaborador.id, resetToken: hash, resetTokenExpiry: { gt: new Date() }, ativo: true },
    data: { senhaHash, resetToken: null, resetTokenExpiry: null, mustChangePassword: false },
  })
  if (resultado.count !== 1) return NextResponse.json({ error: 'Link inválido ou expirado. Solicite outro.' }, { status: 400 })

  await registrarAuditoria({ ator: colaborador, acao: 'editar', entidade: 'Colaborador', entidadeId: colaborador.id, descricao: `${colaborador.nome} redefiniu a senha por e-mail` })
  const resposta = NextResponse.json({ ok: true })
  resposta.cookies.set(COOKIE_SESSAO, '', { path: '/', maxAge: 0 })
  return resposta
}
