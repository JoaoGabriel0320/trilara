import { exigirInterno } from '@/lib/auth/session'
// src/app/(sistema)/lab/page.tsx — mural de ideias da Trilara Lab

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { formatarQuando } from '@/lib/ideias'
import { ListaIdeias, type IdeiaItem } from '@/components/kb/ListaIdeias'

export const metadata: Metadata = {
  title: 'Trilara Lab · Trilara',
  robots: { index: false, follow: false },
}

export default async function LabPage() {
  await exigirInterno()
  const sistemasCatalogo = await listarSistemas()
  const registros = await prisma.ideia.findMany({
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      titulo: true,
      resumo: true,
      status: true,
      sistemaSlug: true,
      criadoEm: true,
      autor: { select: { nome: true } },
      _count: { select: { apoios: true } },
    },
  })

  const ideias: IdeiaItem[] = registros.map((i) => ({
    id: i.id,
    titulo: i.titulo,
    resumo: i.resumo,
    status: i.status,
    sistemaNome: i.sistemaSlug ? (sistemasCatalogo.find((sistema) => sistema.slug === i.sistemaSlug)?.name ?? i.sistemaSlug) : null,
    autorNome: i.autor.nome,
    quando: formatarQuando(i.criadoEm),
    totalApoios: i._count.apoios,
  }))

  return (
    <div className="mx-auto max-w-[840px] portal-page px-4 py-5 sm:px-8 sm:py-16">
      <header className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo text-brand-600 dark:text-brand-400">Trilara Lab</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            Ideias para os nossos sistemas
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[14.5px] leading-relaxed text-ink-500 dark:text-ink-400">
            Um jeito de sugerir e discutir melhorias para o sistemas cadastrados — direto
            de quem opera no dia a dia. Apoie o que faz sentido pra sua rotina.
          </p>
        </div>

        <Link
          href="/lab/nova"
          className="shrink-0 rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-600"
        >
          Nova ideia
        </Link>
      </header>

      {ideias.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 px-6 py-14 text-center dark:border-ink-700">
          <p className="text-[15px] font-medium text-ink-800 dark:text-ink-100">Nenhuma ideia ainda</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[13.5px] leading-relaxed text-ink-500 dark:text-ink-400">
            Percebeu algo que poderia funcionar melhor em algum dos {sistemasCatalogo.length} sistemas?
            Seja a primeira pessoa a registrar.
          </p>
          <Link
            href="/lab/nova"
            className="mt-6 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-600"
          >
            Publicar a primeira ideia
          </Link>
        </div>
      ) : (
        <ListaIdeias ideias={ideias} />
      )}
    </div>
  )
}
