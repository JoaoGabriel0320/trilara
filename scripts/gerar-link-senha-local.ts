// Gera um link de redefinição no terminal para a instalação local, sem SMTP.
// Uso: npm run senha:local -- voce@exemplo.com
import { loadEnvConfig } from '@next/env'
import { PrismaClient } from '@prisma/client'
import { emailValido } from '../src/lib/publico'
import { DURACAO_RESET_MS, gerarTokenReset } from '../src/lib/reset-senha'

loadEnvConfig(process.cwd(), false)

async function main() {
  const email = emailValido(process.argv[2])
  if (!email) throw new Error('Uso: npm run senha:local -- voce@exemplo.com')
  const banco = new URL(process.env.DATABASE_URL ?? '')
  if (!['localhost', '127.0.0.1', '[::1]'].includes(banco.hostname)
    || banco.port !== '5435' || banco.pathname !== '/trilara' || banco.username !== 'trilara') {
    throw new Error('Este comando só pode ser usado com o banco pessoal local trilara na porta 5435.')
  }
  const base = new URL(process.env.RESET_BASE_URL ?? 'http://localhost:3002')
  if (base.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)) {
    throw new Error('RESET_BASE_URL deve apontar para o servidor local ao usar este comando.')
  }
  const prisma = new PrismaClient()
  try {
    const conta = await prisma.colaborador.findUnique({ where: { email }, select: { id: true, ativo: true } })
    if (!conta?.ativo) throw new Error('Nenhuma conta ativa encontrada para este e-mail.')

    const { token, hash } = gerarTokenReset()
    await prisma.colaborador.update({
      where: { id: conta.id },
      data: { resetToken: hash, resetTokenExpiry: new Date(Date.now() + DURACAO_RESET_MS) },
    })
    const link = new URL('/redefinir-senha', base)
    link.searchParams.set('token', token)
    console.log(`Abra este link no navegador local em até 30 minutos:\n${link}`)
    console.log('O link é de uso único. Não o compartilhe.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((erro) => { console.error(erro); process.exitCode = 1 })
