import { NextResponse, type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { emailCorporativo } from '@/lib/email-corporativo'
import { emailValido, publicoValido } from '@/lib/publico'
import { chaveDaRequisicao, estaBloqueado, registrarFalha } from '@/lib/rateLimit'
import { lerJsonLimitado } from '@/lib/json-limitado'

export const runtime = 'nodejs'

const respostaPublica = () => NextResponse.json({
  ok: true,
  message: 'Se o e-mail puder solicitar acesso, a solicitação será analisada por um administrador.',
}, { status: 202 })

export async function POST(req: NextRequest) {
  const chave = `solicitacao:${chaveDaRequisicao(req)}`
  if (estaBloqueado(chave).bloqueado) return NextResponse.json({ error: 'Muitas solicitações. Tente novamente mais tarde.' }, { status: 429 })
  registrarFalha(chave)
  const corpo = await lerJsonLimitado(req) as Record<string, unknown> | null
  const nome = typeof corpo?.nome === 'string' ? corpo.nome.trim() : ''
  const tipoAcesso = corpo?.tipoAcesso
  if (!publicoValido(tipoAcesso)) return NextResponse.json({ error: 'Selecione um tipo de acesso válido.' }, { status: 400 })
  const externo = tipoAcesso === 'EXTERNO'
  const email = externo ? emailValido(corpo?.email) : emailCorporativo(corpo?.email)
  const empresaNome = typeof corpo?.empresaNome === 'string' ? corpo.empresaNome.trim() : ''
  const senha = corpo?.senha
  const departamentoId = corpo?.departamentoId
  const filialId = corpo?.filialId
  const temDepartamento = typeof departamentoId === 'string' && departamentoId.length > 0
  const temFilial = typeof filialId === 'string' && filialId.length > 0
  if (!nome || nome.length > 120) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 })
  if (!email) return NextResponse.json({ error: externo ? 'Informe um e-mail válido.' : 'Informe um e-mail válido.' }, { status: 400 })
  if (typeof senha !== 'string' || senha.length < 8 || senha.length > 72) return NextResponse.json({ error: 'A senha deve ter entre 8 e 72 caracteres.' }, { status: 400 })
  if (externo && (!empresaNome || empresaNome.length > 160)) return NextResponse.json({ error: 'Informe a empresa ou transportadora (até 160 caracteres).' }, { status: 400 })
  if (!externo && temDepartamento !== temFilial) return NextResponse.json({ error: 'Informe filial e departamento juntos ou deixe ambos em branco.' }, { status: 400 })
  try {
    let departamento: { nome: string } | null = null
    if (!externo && temDepartamento) {
      departamento = await prisma.departamento.findFirst({ where: { id: departamentoId as string, ativo: true }, select: { nome: true } })
      if (!departamento) return NextResponse.json({ error: 'Departamento inválido.' }, { status: 400 })
    }
    if (!externo && temFilial && !(await prisma.filial.findFirst({ where: { id: filialId as string, ativa: true } }))) {
      return NextResponse.json({ error: 'Filial inválida.' }, { status: 400 })
    }
    const senhaHash = await bcrypt.hash(senha, 10)
    if (await prisma.colaborador.findUnique({ where: { email } })) return respostaPublica()
    if (await prisma.solicitacaoAcesso.findFirst({ where: { email, status: 'PENDENTE' } })) return respostaPublica()
    await prisma.solicitacaoAcesso.create({ data: { nome, email, senhaHash, tipoAcesso, empresaNome: externo ? empresaNome : null, departamento: departamento?.nome ?? null, filialId: !externo && typeof filialId === 'string' && filialId ? filialId : null } })
    return respostaPublica()
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return respostaPublica()
    if (e instanceof Prisma.PrismaClientInitializationError || (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P1001')) {
      return NextResponse.json({ error: process.env.NODE_ENV === 'production' ? 'Serviço temporariamente indisponível. Tente novamente mais tarde.' : 'Banco local indisponível. Inicie com npm run db:up:windows e tente novamente.' }, { status: 503 })
    }
    return NextResponse.json({ error: 'Não foi possível enviar a solicitação.' }, { status: 500 })
  }
}
