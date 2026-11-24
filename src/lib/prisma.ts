// src/lib/prisma.ts
//
// Cliente Prisma singleton. Em dev o Next recarrega os módulos a cada alteração,
// e sem este cache cada reload abriria um novo pool de conexões até o Postgres
// recusar novas sessões.

import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaSchema?: string }

// Em desenvolvimento, o client antigo pode continuar no global após gerar outro
// modelo. A assinatura dos campos evita reutilizá-lo depois de mudar o schema.
const prismaSchema = Prisma.dmmf.datamodel.models
  .map((modelo) => `${modelo.name}:${modelo.fields.map((campo) => campo.name).join(',')}`)
  .join('|')

export const prisma = globalForPrisma.prisma && globalForPrisma.prismaSchema === prismaSchema
  ? globalForPrisma.prisma
  : new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaSchema = prismaSchema
}
