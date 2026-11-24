import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function CabecalhoDocumento({ editando = false, destino = "/admin" }: { editando?: boolean; destino?: string }) {
  return (
    <>
      <nav aria-label="Navegação estrutural" className="rotulo mb-3 sm:mb-6 flex flex-wrap items-center gap-2 text-ink-400">
        <Link href={destino} className="hover:text-brand-600 dark:hover:text-brand-400">Documentos</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink-700 dark:text-ink-300">
          {editando ? 'Editar' : 'Novo documento'}
        </span>
      </nav>
      <header className="mb-5 sm:mb-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">
            {editando ? 'Editar documento' : 'Novo documento'}
          </h1>
          <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">
            {editando
              ? 'Atualize o conteúdo e organize a publicação na Trilara.'
              : 'Adicione um conteúdo e organize onde ele aparece na Trilara.'}
          </p>
        </div>
        <Link
          href={destino}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-[14px] font-medium text-ink-600 transition hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar<span className="hidden sm:inline"> para documentos</span>
        </Link>
      </header>
    </>
  )
}
