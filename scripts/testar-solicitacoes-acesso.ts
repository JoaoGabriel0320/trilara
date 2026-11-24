import assert from 'node:assert/strict'
import { randomInt, randomUUID } from 'node:crypto'
import { loadEnvConfig } from '@next/env'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { DURACAO_RESET_MS, gerarTokenReset } from '../src/lib/reset-senha'

loadEnvConfig(process.cwd(), false)
const base = process.argv[2] ?? 'http://127.0.0.1:3002'
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('O servidor de teste deve ser local.')
if (!['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname)) throw new Error('O banco de teste deve ser local.')

const prisma = new PrismaClient()
const prefixo = `teste-solicitacao-${randomUUID()}`
const ipTeste = `198.51.100.${randomInt(1, 255)}`
const emailAdmin = `${prefixo}@example.invalid`
const emailInterno = `${prefixo}-interno@example.invalid`
const emailSemVinculo = `${prefixo}-pessoal@example.invalid`
const emailExterno = `${prefixo}-externo@example.invalid`

async function pedir(caminho: string, corpo: Record<string, unknown>, cookie?: string) {
  return fetch(new URL(caminho, base), {
    method: 'POST',
    headers: { Origin: base, 'X-Real-IP': ipTeste, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(30_000),
  })
}

async function aprovar(id: string, cookie: string, papel: string, identidadeConfirmada: boolean) {
  return fetch(new URL(`/api/admin/solicitacoes/${id}`, base), {
    method: 'PATCH',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisao: 'APROVADA', papel, identidadeConfirmada }),
    signal: AbortSignal.timeout(30_000),
  })
}

async function executar() {
  await prisma.colaborador.create({ data: {
    nome: prefixo, email: emailAdmin, senhaHash: await bcrypt.hash('SenhaTeste123!', 10),
    papel: 'ADMIN', tipoAcesso: 'INTERNO',
  } })

  const login = await pedir('/api/login', { email: emailAdmin, senha: 'SenhaTeste123!' })
  assert.equal(login.status, 200, 'login do administrador de teste')
  const cookie = login.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie, 'cookie de sessão do administrador')

  const internoSemFilial = await pedir('/api/solicitar-acesso', {
    nome: 'Pessoa de teste', email: emailSemVinculo, senha: 'SenhaTeste123!',
    tipoAcesso: 'INTERNO',
  })
  assert.equal(internoSemFilial.status, 202, 'conta pessoal não exige filial ou departamento')
  const respostaInicial = await internoSemFilial.text()
  const pedidoDuplicado = await pedir('/api/solicitar-acesso', {
    nome: 'Pessoa de teste', email: emailSemVinculo, senha: 'SenhaTeste123!',
    tipoAcesso: 'INTERNO',
  })
  assert.equal(pedidoDuplicado.status, 202, 'solicitação repetida não revela existência do e-mail')
  assert.equal(await pedidoDuplicado.text(), respostaInicial, 'resposta pública igual para e-mail novo e pendente')
  const pedidoPessoal = await prisma.solicitacaoAcesso.findFirstOrThrow({ where: { email: emailSemVinculo } })
  assert.equal(pedidoPessoal.filialId, null)
  assert.equal(pedidoPessoal.departamento, null)
  assert.equal((await aprovar(pedidoPessoal.id, cookie, 'COLABORADOR', true)).status, 200, 'aprovação da conta pessoal')
  assert.equal((await pedir('/api/login', { email: emailSemVinculo, senha: 'SenhaTeste123!' })).status, 200, 'login após aprovação')
  const { token, hash } = gerarTokenReset()
  await prisma.colaborador.update({
    where: { email: emailSemVinculo },
    data: { resetToken: hash, resetTokenExpiry: new Date(Date.now() + DURACAO_RESET_MS) },
  })
  assert.equal((await pedir('/api/redefinir-senha', { token, novaSenha: 'NovaSenhaTeste123!' })).status, 200, 'redefinição de senha')
  assert.equal((await pedir('/api/login', { email: emailSemVinculo, senha: 'NovaSenhaTeste123!' })).status, 200, 'login com senha redefinida')

  const externoSemEmpresa = await pedir('/api/solicitar-acesso', {
    nome: 'Externo inválido', email: emailExterno, senha: 'SenhaTeste123!', tipoAcesso: 'EXTERNO',
  })
  assert.equal(externoSemEmpresa.status, 400, 'externo precisa informar empresa')

  const solicitacao = await pedir('/api/solicitar-acesso', {
    nome: 'Cliente de teste', email: emailExterno, senha: 'SenhaTeste123!',
    tipoAcesso: 'EXTERNO', empresaNome: 'Transportadora de teste',
  })
  assert.equal(solicitacao.status, 202, 'externo solicita acesso sem departamento e filial')
  const pendente = await prisma.solicitacaoAcesso.findFirstOrThrow({ where: { email: emailExterno } })
  assert.equal(pendente.tipoAcesso, 'EXTERNO')
  assert.equal(pendente.empresaNome, 'Transportadora de teste')
  assert.equal(pendente.departamento, null)
  assert.equal(pendente.filialId, null)

  assert.equal((await aprovar(pendente.id, cookie, 'ADMIN', true)).status, 400, 'externo não pode receber papel de admin')
  assert.equal((await aprovar(pendente.id, cookie, 'COLABORADOR', false)).status, 400, 'aprovação exige confirmação da identidade')
  assert.equal((await aprovar(pendente.id, cookie, 'COLABORADOR', true)).status, 200, 'aprovação externa')

  const conta = await prisma.colaborador.findUniqueOrThrow({ where: { email: emailExterno } })
  assert.equal(conta.tipoAcesso, 'EXTERNO')
  assert.equal(conta.papel, 'COLABORADOR')
  assert.equal(conta.empresaNome, 'Transportadora de teste')
  assert.equal(conta.departamento, null)
  assert.equal(conta.filialNome, null)

  const filial = await prisma.filial.create({ data: { nome: `${prefixo}-filial` } })
  const departamento = await prisma.departamento.create({ data: { nome: `${prefixo}-departamento` } })
  const solicitacaoInterna = await pedir('/api/solicitar-acesso', {
    nome: 'Colaborador de teste', email: emailInterno, senha: 'SenhaTeste123!',
    tipoAcesso: 'INTERNO', filialId: filial.id, departamentoId: departamento.id,
  })
  assert.equal(solicitacaoInterna.status, 202, 'dados de filial opcionais ainda são aceitos')
  const pendenteInterno = await prisma.solicitacaoAcesso.findFirstOrThrow({ where: { email: emailInterno } })
  assert.equal(pendenteInterno.tipoAcesso, 'INTERNO')
  assert.equal((await aprovar(pendenteInterno.id, cookie, 'COLABORADOR', true)).status, 200, 'aprovação interna')
  const contaInterna = await prisma.colaborador.findUniqueOrThrow({ where: { email: emailInterno } })
  assert.equal(contaInterna.tipoAcesso, 'INTERNO')
  assert.equal(contaInterna.empresaNome, null)
  assert.equal(contaInterna.departamento, departamento.nome)
  assert.equal(contaInterna.filialNome, filial.nome)
  console.log('OK: solicitação, aprovação, login e redefinição de senha da conta pessoal; fluxo legado preservado.')
}

executar().catch((erro) => { console.error(erro); process.exitCode = 1 }).finally(async () => {
  try {
    await prisma.auditLog.deleteMany({ where: { actorEmail: emailAdmin } })
    await prisma.solicitacaoAcesso.deleteMany({ where: { email: { in: [emailExterno, emailInterno, emailSemVinculo] } } })
    await prisma.colaborador.deleteMany({ where: { email: { in: [emailAdmin, emailExterno, emailInterno, emailSemVinculo] } } })
    await prisma.departamento.deleteMany({ where: { nome: `${prefixo}-departamento` } })
    await prisma.filial.deleteMany({ where: { nome: `${prefixo}-filial` } })
  } finally {
    await prisma.$disconnect()
  }
})
