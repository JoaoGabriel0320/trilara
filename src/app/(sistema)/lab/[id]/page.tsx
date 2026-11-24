// src/app/(sistema)/lab/[id]/page.tsx — detalhe de uma ideia

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigirInterno } from '@/lib/auth/session'
import { souAdmin } from '@/lib/auth/jwt'
import { getSistema } from '@/lib/sistemas'
import { markdownParaHtml } from '@/lib/markdown'
import { ROTULO_STATUS, COR_STATUS, formatarQuando } from '@/lib/ideias'
import { PontoSistema } from '@/components/portal/PlacaSistema'
import { BotaoApoiar } from '@/components/kb/BotaoApoiar'
import { PainelGestaoIdeia } from '@/components/kb/PainelGestaoIdeia'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  await exigirInterno()
  const { id } = await params
  const ideia = await prisma.ideia.findUnique({ where: { id }, select: { titulo: true } })
  return {
    title: ideia ? `${ideia.titulo} · Trilara Lab` : 'Trilara Lab',
    robots: { index: false, follow: false },
  }
}

export default async function IdeiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sessao = await exigirInterno()

  const [ideia, totalApoios, apoioDoUsuario, maiorApoio] = await Promise.all([
    prisma.ideia.findUnique({
      where: { id },
      include: { autor: { select: { nome: true } } },
    }),
    prisma.apoioIdeia.count({ where: { ideiaId: id } }),
    prisma.apoioIdeia.findUnique({
      where: { ideiaId_colaboradorId: { ideiaId: id, colaboradorId: sessao.id } },
    }),
    prisma.ideia.findFirst({
      orderBy: { apoios: { _count: 'desc' } },
      select: { _count: { select: { apoios: true } } },
    }),
  ])

  if (!ideia) notFound()

  const sistema = ideia.sistemaSlug ? await getSistema(ideia.sistemaSlug) : null
  const maximo = Math.max(1, maiorApoio?._count.apoios ?? 1, totalApoios)
  const editor = souAdmin(sessao.papel)

  return (
    <div className="mx-auto max-w-[720px] portal-page px-4 py-5 sm:px-8 sm:py-16">
      <nav className="rotulo mb-6 text-ink-400">
        <Link href="/lab" className="hover:text-brand-600 dark:hover:text-brand-400">
          Trilara Lab
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700 dark:text-ink-300">{ideia.titulo}</span>
      </nav>

      <header className="mb-7 border-b border-ink-200 pb-6 dark:border-ink-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rotulo rounded-full px-2 py-0.5 ${COR_STATUS[ideia.status]}`}>
            {ROTULO_STATUS[ideia.status]}
          </span>
          {sistema && (
            <span className="flex items-center gap-1.5 text-[12.5px] text-ink-500 dark:text-ink-400">
              <PontoSistema />
              {sistema.name}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-[26px] font-semibold leading-tight tracking-tight text-ink-900 dark:text-ink-50">
          {ideia.titulo}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600 dark:text-ink-400">{ideia.resumo}</p>
        <p className="rotulo mt-3 text-ink-400">
          {ideia.autor.nome} · {formatarQuando(ideia.criadoEm)}
        </p>

        <div className="mt-5">
          <BotaoApoiar
            ideiaId={ideia.id}
            totalInicial={totalApoios}
            maximo={maximo}
            apoiadoInicial={Boolean(apoioDoUsuario)}
          />
        </div>
      </header>

      <article
        className="text-[15px] text-ink-700 dark:text-ink-300"
        dangerouslySetInnerHTML={{ __html: markdownParaHtml(ideia.conteudo) }}
      />

      <PainelGestaoIdeia
        ideiaId={ideia.id}
        titulo={ideia.titulo}
        status={ideia.status}
        podeMudarStatus={editor}
        podeEditarOuExcluir={editor || ideia.autorId === sessao.id}
      />
    </div>
  )
}
