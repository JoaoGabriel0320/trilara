// src/app/api/login/route.ts

import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { assinarToken, COOKIE_SESSAO, DURACAO_SESSAO_SEGUNDOS, type Papel } from '@/lib/auth/jwt'
import { chaveDaRequisicao, bloqueioLogin, iniciarTentativaLogin, registrarFalhaLogin, limparTentativasLogin } from '@/lib/rateLimit'
import { registrarAuditoria } from '@/lib/audit'
import { emailValido } from '@/lib/publico'
import { marcaCredencial } from '@/lib/auth/credencial'
import { lerJsonLimitado } from '@/lib/json-limitado'

export async function POST(req: NextRequest) {
  const corpo = await lerJsonLimitado(req)
  if (!corpo || typeof corpo !== 'object' || Array.isArray(corpo)) {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const campos = corpo as Record<string, unknown>
  const email = emailValido(campos.email)
  const senha = campos.senha

  if (typeof campos.email !== 'string' || typeof senha !== 'string' || !senha) {
    return NextResponse.json({ error: 'Preencha e-mail e senha.' }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
  }
  if (senha.length > 72) {
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
  }

  const chave = chaveDaRequisicao(req, email)
  const chaveEmail = `login-email:${email}`
  const chaveIp = `login-ip:${chaveDaRequisicao(req)}`
  function respostaBloqueio(segundos: number) {
    const espera = segundos >= 86_400 ? '1 dia' : segundos >= 3_600 ? `${Math.ceil(segundos / 3_600)} horas` : segundos >= 60 ? `${Math.ceil(segundos / 60)} minutos` : `${segundos} segundos`
    return NextResponse.json(
      { error: `Muitas tentativas. Aguarde ${espera} e tente novamente.` },
      { status: 429, headers: { 'Retry-After': String(segundos) } }
    )
  }

  const travas = [bloqueioLogin(chave), bloqueioLogin(chaveEmail), bloqueioLogin(chaveIp)]
  const esperaInicial = Math.max(...travas.map((trava) => trava.esperarSegundos))
  if (esperaInicial > 0) return respostaBloqueio(esperaInicial)
  const reservas = [iniciarTentativaLogin(chave), iniciarTentativaLogin(chaveEmail)]
  const esperaReserva = Math.max(...reservas.map((reserva) => reserva.esperarSegundos))
  if (esperaReserva > 0) return respostaBloqueio(esperaReserva)

  function respostaLoginIncorreto() {
    registrarFalhaLogin(chaveIp, 30)
    const espera = Math.max(bloqueioLogin(chave).esperarSegundos, bloqueioLogin(chaveEmail).esperarSegundos, bloqueioLogin(chaveIp).esperarSegundos)
    if (espera > 0) return respostaBloqueio(espera)
    return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
  }

  const colaborador = await prisma.colaborador.findUnique({ where: { email } })

  // Mesma mensagem para "não existe", "inativo" e "senha errada": não entregamos
  // ao atacante a informação de quais e-mails existem.
  if (!colaborador || !colaborador.ativo) return respostaLoginIncorreto()

  const senhaConfere = await bcrypt.compare(senha, colaborador.senhaHash)
  if (!senhaConfere) return respostaLoginIncorreto()

  // O bloqueio da linha da conta serializa logins simultâneos no mesmo usuário.
  // Cada novo acesso substitui todas as sessões ainda válidas dessa conta.
  const registro = await prisma.$transaction(async (tx) => {
    const [conta] = await tx.$queryRaw<Array<{ ativo: boolean; senhaHash: string }>>`
      SELECT "ativo", "senhaHash" FROM "Colaborador" WHERE "id" = ${colaborador.id} FOR UPDATE
    `
    if (!conta?.ativo || conta.senhaHash !== colaborador.senhaHash) return null

    const agora = new Date()
    await tx.sessaoColaborador.updateMany({
      where: { colaboradorId: colaborador.id, substituidaEm: null },
      data: { substituidaEm: agora },
    })
    const novaSessao = await tx.sessaoColaborador.create({
      data: {
        colaboradorId: colaborador.id,
        expiraEm: new Date(agora.getTime() + DURACAO_SESSAO_SEGUNDOS * 1000),
      },
      select: { id: true },
    })
    await tx.colaborador.update({
      where: { id: colaborador.id },
      data: { ultimoLoginEm: agora, resetToken: null, resetTokenExpiry: null },
    })
    return novaSessao
  })
  if (!registro) return respostaLoginIncorreto()
  limparTentativasLogin(chave)
  limparTentativasLogin(chaveEmail)

  const token = await assinarToken({
    id: colaborador.id,
    sessaoId: registro.id,
    email: colaborador.email,
    nome: colaborador.nome,
    papel: colaborador.papel as Papel,
    credencial: marcaCredencial(colaborador.senhaHash),
    mustChangePassword: colaborador.mustChangePassword,
  })

  await registrarAuditoria({
    ator: colaborador,
    acao: 'login',
    entidade: 'Colaborador',
    entidadeId: colaborador.id,
    descricao: `${colaborador.nome} entrou na área de documentação`,
  })

  const res = NextResponse.json({
    ok: true,
    nome: colaborador.nome,
    mustChangePassword: colaborador.mustChangePassword,
  })

  res.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Em produção o Nginx termina o TLS e o Next recebe HTTP puro, então não dá
    // para inferir do protocolo da request — vem do ambiente.
    secure: process.env.NODE_ENV === 'production',
    maxAge: DURACAO_SESSAO_SEGUNDOS,
    path: '/',
  })

  return res
}
