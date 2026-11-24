import { exigirAdmin } from '@/lib/auth/session'
// src/app/admin/documentos/novo/page.tsx

import type { Metadata } from 'next'
import { CabecalhoDocumento } from '@/components/kb/CabecalhoDocumento'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { FormDocumento } from '@/components/kb/FormDocumento'

export const metadata: Metadata = {
  title: 'Novo documento · Trilara',
  robots: { index: false, follow: false },
}

export default async function NovoDocumentoPage() {
  await exigirAdmin()
  const sistemasCatalogo = await listarSistemas()
  const categorias = await prisma.categoria.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, sistemaSlug: true },
  })

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <CabecalhoDocumento />

      <FormDocumento
        sistemas={sistemasCatalogo.map((s) => ({ slug: s.slug, name: s.name }))}
        categorias={categorias}
      />
    </div>
  )
}
