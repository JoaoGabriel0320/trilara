import { exigirAdmin } from '@/lib/auth/session'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { GerenciarDepartamentos } from '@/components/kb/GerenciarDepartamentos'

export default async function DepartamentosPage() {
  await exigirAdmin()
  const departamentos = await prisma.departamento.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true, ativo: true } })
  return <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 xl:px-10"><Link href="/admin/usuarios" className="text-sm text-brand-600">← Colaboradores</Link><h1 className="my-6 text-2xl font-semibold text-ink-900 dark:text-white">Departamentos</h1><GerenciarDepartamentos departamentos={departamentos} /></div>
}
