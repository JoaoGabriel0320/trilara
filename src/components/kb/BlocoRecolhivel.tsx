'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function BlocoRecolhivel({ id, rotulo, resumo, imprimir = true, aberto, aoAlternar, children }: {
  id: string
  rotulo: string
  resumo: string
  imprimir?: boolean
  aberto?: boolean
  aoAlternar?: (aberto: boolean) => void
  children: React.ReactNode
}) {
  const [estadoInterno, setEstadoInterno] = useState(false)
  const controlado = aberto !== undefined
  const estaAberto = controlado ? aberto : estadoInterno
  function alternar() {
    const proximo = !estaAberto
    if (!controlado) setEstadoInterno(proximo)
    aoAlternar?.(proximo)
  }

  return <section aria-labelledby={`${id}-rotulo`} className={imprimir ? '' : 'print:!hidden'}>
    <h2 id={`${id}-rotulo`} className="rotulo hidden px-1 text-brand-600 dark:text-brand-400 xl:block print:!block">{rotulo}</h2>
    <h2 className="xl:hidden print:!hidden">
      <button type="button" onClick={alternar} aria-expanded={estaAberto} aria-controls={id} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 text-left dark:border-ink-700 dark:bg-ink-800">
        <span><span className="block text-[13px] font-semibold text-ink-900 dark:text-ink-50">{rotulo}</span><span className="mt-0.5 block text-[11px] text-ink-500 dark:text-ink-400">{resumo}</span></span>
        <ChevronDown size={18} aria-hidden="true" className={`shrink-0 text-ink-400 transition ${estaAberto ? 'rotate-180' : ''}`} />
      </button>
    </h2>
    <div id={id} className={`${estaAberto ? 'block' : 'hidden'} xl:block ${imprimir ? 'print:!block' : ''}`}>{children}</div>
  </section>
}
