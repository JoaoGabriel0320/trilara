import { exigirInterno } from '@/lib/auth/session'
// src/app/(sistema)/lab/nova/page.tsx

import type { Metadata } from 'next'
import Link from 'next/link'
import { listarSistemas } from '@/lib/sistemas'
import { FormIdeia } from '@/components/kb/FormIdeia'

export const metadata: Metadata = {
  title: 'Nova ideia · Trilara',
  robots: { index: false, follow: false },
}

export default async function NovaIdeiaPage() {
  await exigirInterno()
  const sistemasCatalogo = await listarSistemas()
  return (
    <div className="mx-auto max-w-[680px] portal-page px-4 py-5 sm:px-8 sm:py-14">
      <nav className="rotulo mb-6 text-ink-400">
        <Link href="/lab" className="hover:text-brand-600 dark:hover:text-brand-400">
          Trilara Lab
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-700 dark:text-ink-300">Nova ideia</span>
      </nav>

      <h1 className="mb-1.5 text-[24px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
        Nova ideia
      </h1>
      <p className="mb-8 text-[14px] text-ink-500 dark:text-ink-400">
        Vale registrar mesmo sem estar pronta. O time de TI e os outros colaboradores discutem a partir daqui.
      </p>

      <FormIdeia sistemas={sistemasCatalogo.map((s) => ({ slug: s.slug, name: s.name }))} />
    </div>
  )
}
