import { PrismaClient } from '@prisma/client'
import { emailCorporativo } from '../src/lib/email-corporativo'

const prisma = new PrismaClient()

async function main() {
  const email = emailCorporativo(process.argv[2])
  if (!email) throw new Error('Uso: npm run admin:proteger -- <admin@exemplo.com>')

  const resultado = await prisma.colaborador.updateMany({
    where: { email, papel: 'ADMIN', ativo: true },
    data: { adminProtegido: true },
  })
  if (resultado.count !== 1) {
    throw new Error('Não foi encontrada uma conta administrativa ativa com este e-mail.')
  }
  console.log(`Conta administrativa protegida: ${email}`)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
