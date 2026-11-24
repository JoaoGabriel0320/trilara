import { exigirAdmin } from '@/lib/auth/session'
// src/app/(sistema)/admin/usuarios/novo/page.tsx

import type { Metadata } from 'next'
import { FormUsuario } from '@/components/kb/FormUsuario'
import { CabecalhoUsuario } from '@/components/kb/CabecalhoUsuario'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  title: 'Novo colaborador · Trilara',
  robots: { index: false, follow: false },
}

export default async function NovoUsuarioPage() {
  await exigirAdmin()
  const [filiais, departamentos] = await Promise.all([
    prisma.filial.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    prisma.departamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ])
  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <CabecalhoUsuario />
      <FormUsuario filiais={filiais} departamentos={departamentos} />
    </div>
  )
}
