import { exigirSessao } from '@/lib/auth/session'
import { documentosVisiveis, podeAcessarSistema } from '@/lib/publico'
// src/app/(sistema)/documentacao/page.tsx
//
// Catálogo dos sistemas com uma prévia dos manuais publicados em cada um.

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { PlacaSistema } from '@/components/portal/PlacaSistema'
import { ArrowRight, BookOpen, FileText, Link2, ListOrdered, LayoutGrid, Star } from 'lucide-react'
import type { System } from '@/types'

export const metadata: Metadata = {
  title: 'Documentação · Trilara',
  robots: { index: false, follow: false },
}

type DocumentoResumo = { slug: string; titulo: string; tipo: 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF' }

function CartaoSistema({ sistema, total, documentos }: { sistema: System; total: number; documentos: DocumentoResumo[] }) {
  const vazio = total === 0

  return (
    <article className={'flex h-full min-w-0 flex-col rounded-2xl border bg-white p-5 dark:bg-ink-800 sm:p-6 ' + (
      vazio ? 'border-dashed border-ink-300 dark:border-ink-700' : 'border-ink-200 shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-ink-700 dark:hover:border-brand-600'
    )}>
      <div className="flex items-start justify-between gap-3">
        <PlacaSistema slug={sistema.slug} size="lg" />
        <span className={'rounded-full px-3 py-1 text-[12px] font-medium ' + (vazio
          ? 'bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-300'
          : 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300')}>
          {vazio ? 'Em preparação' : `${total} ${total === 1 ? 'manual' : 'manuais'}`}
        </span>
      </div>

      <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
        {vazio ? sistema.name : (
          <Link href={`/documentacao/${sistema.slug}`} className="rounded-sm hover:text-brand-600 dark:hover:text-brand-400">
            {sistema.name}
          </Link>
        )}
      </h3>
      <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-ink-500 dark:text-ink-400">
        {sistema.description}
      </p>

      <div className="mt-auto pt-6">
        <div className="border-t border-ink-200 pt-4 dark:border-ink-700">
          {vazio ? (
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
              <BookOpen size={17} aria-hidden="true" className="mt-0.5 shrink-0" />
              Os manuais deste sistema ainda não foram publicados.
            </p>
          ) : (
            <>
              <p className="rotulo mb-2.5 text-ink-500 dark:text-ink-400">Manuais recentes</p>
              <ul className="space-y-1">
                {documentos.map((documento) => (
                  <li key={documento.slug}>
                    <Link
                      href={`/documentacao/${sistema.slug}/${documento.slug}`}
                      className="group flex min-h-9 items-center gap-2 rounded-lg px-1 py-1 text-[13px] font-medium text-ink-700 transition hover:bg-ink-50 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-700 dark:hover:text-brand-400"
                    >
                      {documento.tipo === 'LINK' ? <Link2 size={15} aria-hidden="true" className="shrink-0 text-ink-400" /> : documento.tipo === 'PASSO_A_PASSO' ? <ListOrdered size={15} aria-hidden="true" className="shrink-0 text-ink-400" /> : <FileText size={15} aria-hidden="true" className="shrink-0 text-ink-400" />}
                      <span className="min-w-0 truncate">{documento.titulo}</span>
                      <ArrowRight size={14} aria-hidden="true" className="ml-auto shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={`/documentacao/${sistema.slug}`}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-[13px] font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Ver todos os manuais <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

export default async function DocumentacaoPage() {
  const sessao = await exigirSessao()
  const sistemasCatalogo = (await listarSistemas()).filter((s) => podeAcessarSistema(sessao, s.slug))
  const contagens = await prisma.documento.groupBy({
    by: ['sistemaSlug'],
    where: documentosVisiveis(sessao),
    _count: { _all: true },
  })
  const porSistema = new Map(contagens.map((c) => [c.sistemaSlug, c._count._all]))

  const sistemasComManuais = sistemasCatalogo.filter((s) => (porSistema.get(s.slug) ?? 0) > 0)
  const recentes = await Promise.all(sistemasComManuais.map(async (sistema) => ({
    slug: sistema.slug,
    documentos: await prisma.documento.findMany({
      where: { AND: [documentosVisiveis(sessao), { sistemaSlug: sistema.slug }] },
      orderBy: [{ atualizadoEm: 'desc' }, { titulo: 'asc' }],
      take: 2,
      select: { slug: true, titulo: true, tipo: true },
    }),
  })))
  const recentesPorSistema = new Map(recentes.map((item) => [item.slug, item.documentos]))

  const internos = sistemasCatalogo.filter((s) => s.kind !== 'external')
  const externos = sistemasCatalogo.filter((s) => s.kind === 'external')

  const grupos = [
    { titulo: 'Sistemas da equipe', descricao: 'Soluções desenvolvidas pela nossa equipe.', sistemas: internos },
    { titulo: 'Sistemas de terceiros', descricao: 'Plataformas utilizadas na operação.', sistemas: externos },
  ].filter((g) => g.sistemas.length > 0)

  const totalManuais = sistemasCatalogo.reduce((total, sistema) => total + (porSistema.get(sistema.slug) ?? 0), 0)

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Documentação</h1>
          <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">Encontre manuais, guias e procedimentos dos sistemas usados na operação.</p>
        </div>
        <Link href="/favoritos" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-brand-600 dark:border-ink-700 dark:bg-ink-800 dark:text-brand-400"><Star size={17} aria-hidden="true" /> Meus favoritos</Link>
      </header>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
          <LayoutGrid size={20} aria-hidden="true" className="text-brand-500" />
          <p className="mt-4 text-[27px] font-semibold tabular-nums tracking-tight text-ink-900 dark:text-ink-50">{sistemasCatalogo.length}</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Sistemas no catálogo</p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
          <BookOpen size={20} aria-hidden="true" className="text-brand-500" />
          <p className="mt-4 text-[27px] font-semibold tabular-nums tracking-tight text-ink-900 dark:text-ink-50">{sistemasComManuais.length}</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Com documentação disponível</p>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
          <FileText size={20} aria-hidden="true" className="text-brand-500" />
          <p className="mt-4 text-[27px] font-semibold tabular-nums tracking-tight text-ink-900 dark:text-ink-50">{totalManuais}</p>
          <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Manuais publicados</p>
        </div>
      </div>

      <div className="space-y-10">
        {grupos.map((grupo) => (
          <section key={grupo.titulo} aria-label={grupo.titulo}>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-ink-200 pb-4 dark:border-ink-800">
              <div>
                <h2 className="text-[18px] font-semibold text-ink-900 dark:text-ink-50">{grupo.titulo}</h2>
                <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{grupo.descricao}</p>
              </div>
              <span className="text-[13px] font-medium text-ink-500 dark:text-ink-400">
                {grupo.sistemas.length} {grupo.sistemas.length === 1 ? 'sistema' : 'sistemas'}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {grupo.sistemas.map((sistema) => (
                <CartaoSistema
                  key={sistema.slug}
                  sistema={sistema}
                  total={porSistema.get(sistema.slug) ?? 0}
                  documentos={recentesPorSistema.get(sistema.slug) ?? []}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
