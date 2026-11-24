import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, Settings2 } from 'lucide-react'
import { exigirInterno } from '@/lib/auth/session'
import { souAdmin } from '@/lib/auth/jwt'
import { listarSistemas } from '@/lib/sistemas'
import { prisma } from '@/lib/prisma'
import { documentosVisiveis } from '@/lib/publico'
import { EcossistemaSistemas } from '@/components/ecossistema/EcossistemaSistemas'

export const metadata: Metadata = {
  title: 'Ecossistema de Sistemas · Trilara',
  robots: { index: false, follow: false },
}

export default async function EcossistemaPage() {
  const sessao = await exigirInterno()
  const [sistemas, contagens] = await Promise.all([
    listarSistemas(),
    prisma.documento.groupBy({ by: ['sistemaSlug'], where: documentosVisiveis(sessao), _count: { _all: true } }),
  ])
  const porSistema = new Map(contagens.map(item => [item.sistemaSlug, item._count._all]))
  return <div className="portal-page w-full px-4 py-5 sm:px-8 sm:py-10 xl:px-10">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="rotulo text-brand-600 dark:text-brand-400">Conheça a operação</p>
        <h1 className="mt-2 text-[27px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Ecossistema de Sistemas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500 dark:text-ink-400">Descubra o papel de cada sistema e como eles se conectam.</p>
      </div>
      {souAdmin(sessao.papel) && <Link href="/admin/sistemas" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-600 transition hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"><Settings2 size={16} aria-hidden /> Gerenciar sistemas <ArrowUpRight size={15} aria-hidden /></Link>}
    </header>
    <EcossistemaSistemas sistemas={sistemas.map(sistema => ({ ...sistema, totalManuais: porSistema.get(sistema.slug) ?? 0 }))} admin={souAdmin(sessao.papel)} />
  </div>
}
