// scripts/criar-colaborador.ts
//
// Cria ou atualiza um colaborador com a senha já em bcrypt — não dá para digitar
// senha em texto puro no Prisma Studio, o login compara contra o hash.
//
//   npm run colaborador -- voce@exemplo.com "Seu Nome" senha-forte ADMIN
//
// Rodar de novo com o mesmo e-mail redefine a senha e o papel (útil para reset).
// Contas administrativas protegidas não podem ser alteradas por este script.

import bcrypt from 'bcryptjs'
import { PrismaClient, Papel } from '@prisma/client'
import { emailCorporativo } from '../src/lib/email-corporativo'

const prisma = new PrismaClient()

async function main() {
  const [email, nome, senha, papelBruto = 'COLABORADOR'] = process.argv.slice(2)

  if (!email || !nome || !senha) {
    console.error('Uso: npm run colaborador -- <email> "<nome>" <senha> [COLABORADOR|EDITOR|ADMIN]')
    process.exit(1)
  }

  const papeis = ['COLABORADOR', 'EDITOR', 'ADMIN']
  if (!papeis.includes(papelBruto)) {
    console.error(`Papel inválido: ${papelBruto}. Use ${papeis.join(', ')}.`)
    process.exit(1)
  }

  if (senha.length < 8) {
    console.error('A senha precisa ter ao menos 8 caracteres.')
    process.exit(1)
  }

  const senhaHash = await bcrypt.hash(senha, 10)
  const papel = papelBruto as Papel
  const emailNormalizado = email.trim().toLowerCase()
  if (!emailCorporativo(emailNormalizado)) {
    console.error('Informe um e-mail válido.')
    process.exit(1)
  }

  const existente = await prisma.colaborador.findUnique({
    where: { email: emailNormalizado },
    select: { adminProtegido: true },
  })
  if (existente?.adminProtegido) {
    throw new Error('Esta conta administrativa é protegida. Use a recuperação de senha da Trilara.')
  }

  const colaborador = await prisma.colaborador.upsert({
    where: { email: emailNormalizado },
    update: { nome, senhaHash, papel, ativo: true },
    create: { email: emailNormalizado, nome, senhaHash, papel },
  })

  console.log(`OK: ${colaborador.nome} <${colaborador.email}> — papel ${colaborador.papel}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
