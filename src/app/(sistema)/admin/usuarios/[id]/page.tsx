import { exigirAdmin } from '@/lib/auth/session'
// src/app/(sistema)/admin/usuarios/[id]/page.tsx

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { FormUsuario } from '@/components/kb/FormUsuario'
import { CabecalhoUsuario } from '@/components/kb/CabecalhoUsuario'
import { getSessao } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Editar colaborador · Trilara',
  robots: { index: false, follow: false },
}

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirAdmin()
  const { id } = await params
  const sessao = await getSessao()

  const usuario = await prisma.colaborador.findUnique({
    where: { id },
    select: { id: true, nome: true, email: true, departamento: true, filialNome: true, papel: true, tipoAcesso: true, empresaNome: true, fotoKey: true, adminProtegido: true },
  })
  if (!usuario || (usuario.adminProtegido && usuario.id !== sessao?.id)) notFound()
  const [filiais, departamentos] = await Promise.all([
    prisma.filial.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
    prisma.departamento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' }, select: { id: true, nome: true } }),
  ])

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <CabecalhoUsuario editando />
      <FormUsuario usuario={usuario} filiais={filiais} departamentos={departamentos} />
    </div>
  )
}
