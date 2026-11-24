import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailValido } from '@/lib/publico'
import { chaveDaRequisicao, estaBloqueado, registrarFalha } from '@/lib/rateLimit'
import { DURACAO_RESET_MS, gerarTokenReset } from '@/lib/reset-senha'
import { emailResetConfigurado, enviarEmailResetSenha } from '@/lib/email-reset-senha'
import { lerJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

const mensagem = 'Se houver uma conta ativa para este e-mail, você receberá um link para redefinir a senha.'

export async function POST(req: NextRequest) {
  const chave = `recuperar-senha:${chaveDaRequisicao(req)}`
  if (estaBloqueado(chave).bloqueado) return NextResponse.json({ error: 'Muitas solicitações. Tente novamente mais tarde.' }, { status: 429 })
  registrarFalha(chave)

  const corpo = await lerJsonLimitado(req) as Record<string, unknown> | null
  const email = emailValido(corpo?.email)
  if (!email) return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
  if (!emailResetConfigurado()) return NextResponse.json({
    error: process.env.NODE_ENV === 'production'
      ? 'A recuperação por e-mail está temporariamente indisponível. Fale com o administrador.'
      : 'O envio por e-mail não está configurado. Nesta instalação local, gere um link com npm run senha:local -- seu@email.com.',
  }, { status: 503 })

  const colaborador = await prisma.colaborador.findUnique({ where: { email }, select: { id: true, nome: true, ativo: true, resetToken: true, resetTokenExpiry: true } })
  if (!colaborador?.ativo) return NextResponse.json({ ok: true, message: mensagem })
  if (colaborador.resetToken && colaborador.resetTokenExpiry && colaborador.resetTokenExpiry.getTime() > Date.now() + DURACAO_RESET_MS - 2 * 60 * 1000) {
    return NextResponse.json({ ok: true, message: mensagem })
  }

  const { token, hash } = gerarTokenReset()
  await prisma.colaborador.update({ where: { id: colaborador.id }, data: { resetToken: hash, resetTokenExpiry: new Date(Date.now() + DURACAO_RESET_MS) } })
  try {
    await enviarEmailResetSenha(email, colaborador.nome, token)
  } catch (erro) {
    console.error('[recuperar-senha] falha ao enviar e-mail', erro)
    await prisma.colaborador.updateMany({ where: { id: colaborador.id, resetToken: hash }, data: { resetToken: null, resetTokenExpiry: null } })
  }
  return NextResponse.json({ ok: true, message: mensagem })
}
