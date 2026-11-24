// src/app/(sistema)/lab/[id]/editar/page.tsx

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigirInterno } from '@/lib/auth/session'
import { souAdmin } from '@/lib/auth/jwt'
import { listarSistemas } from '@/lib/sistemas'
import { FormIdeia } from '@/components/kb/FormIdeia'

export const metadata: Metadata = {
  title: 'Editar ideia · Trilara',
  robots: { index: false, follow: false },
}

export default async function EditarIdeiaPage({ params }: { params: Promise<{ id: string }> }) {
  const sistemasCatalogo = await listarSistemas()
  const { id } = await params
  const sessao = await exigirInterno()

  const ideia = await prisma.ideia.findUnique({ where: { id } })
  if (!ideia) notFound()

  // Só o autor ou um administrador edita — mesma regra da API.
  if (ideia.autorId !== sessao.id && !souAdmin(sessao.papel)) {
    redirect(`/lab/${id}`)
  }

  return (
    <div className="mx-auto max-w-[680px] portal-page px-4 py-5 sm:px-8 sm:py-14">
      <nav className="rotulo mb-6 text-ink-400">
        <Link href="/lab" className="hover:text-brand-600 dark:hover:text-brand-400">
          Trilara Lab
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/lab/${id}`} className="hover:text-brand-600 dark:hover:text-brand-400">
          {ideia.titulo}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700 dark:text-ink-300">Editar</span>
      </nav>

      <h1 className="mb-8 text-[24px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
        Editar ideia
      </h1>

      <FormIdeia
        sistemas={sistemasCatalogo.map((s) => ({ slug: s.slug, name: s.name }))}
        ideia={{
          id: ideia.id,
          titulo: ideia.titulo,
          resumo: ideia.resumo,
          conteudo: ideia.conteudo,
          sistemaSlug: ideia.sistemaSlug,
        }}
      />
    </div>
  )
}
