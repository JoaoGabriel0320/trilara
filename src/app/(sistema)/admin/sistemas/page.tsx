import type { Metadata } from 'next'
import Link from 'next/link'
import { Network } from 'lucide-react'
import { exigirAdmin } from '@/lib/auth/session'
import { listarSistemasAdmin } from '@/lib/sistemas'
import { GerenciarSistemas } from '@/components/kb/GerenciarSistemas'

export const metadata: Metadata = {
  title: 'Sistemas · Trilara',
  robots: { index: false, follow: false },
}

export default async function SistemasAdminPage() {
  await exigirAdmin()
  const sistemas = await listarSistemasAdmin()
  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-7">
        <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">Sistemas</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Gerencie os sistemas exibidos no site e no portal de documentação.</p>
        <Link href="/ecossistema" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-medium text-brand-600 dark:text-brand-400"><Network size={17} aria-hidden /> Ver ecossistema de sistemas</Link>
      </header>
      <GerenciarSistemas sistemas={sistemas} />
    </div>
  )
}
