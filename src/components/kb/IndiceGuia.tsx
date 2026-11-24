'use client'

import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { BlocoRecolhivel } from '@/components/kb/BlocoRecolhivel'

export function IndiceGuia({ passos }: { passos: { numero: number; titulo: string }[] }) {
  const [atual, setAtual] = useState(1)
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    let quadro = 0
    function medir() {
      quadro = 0
      if (document.documentElement.scrollHeight > window.innerHeight + 4 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        setAtual(passos.length)
        return
      }
      const limite = window.innerHeight * 0.35
      let numero = 1
      for (const passo of passos) {
        const elemento = document.getElementById(`passo-${passo.numero}`)
        if (elemento && elemento.getBoundingClientRect().top <= limite) numero = passo.numero
      }
      setAtual(numero)
    }
    function agendar() {
      if (!quadro) quadro = requestAnimationFrame(medir)
    }
    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
      if (quadro) cancelAnimationFrame(quadro)
    }
  }, [passos])

  return <BlocoRecolhivel id="indice-guia" rotulo="Neste guia" resumo={`Passo ${atual} de ${passos.length}`} imprimir={false} aberto={aberto} aoAlternar={setAberto}>
    <div className="mt-3 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-700 dark:bg-ink-800 xl:mt-2">
      <p className="text-[12px] text-ink-500 dark:text-ink-400">Você está no passo {atual} de {passos.length}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700" aria-hidden="true"><span className="block h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${atual / passos.length * 100}%` }} /></div>
      <nav aria-label="Índice do guia" className="mt-4">
        <ol className="space-y-1">
          {passos.map((passo) => {
            const anterior = passo.numero < atual
            const ativo = passo.numero === atual
            return <li key={passo.numero}>
              <a href={`#passo-${passo.numero}`} aria-current={ativo ? 'step' : undefined} onClick={() => { if (!window.matchMedia('(min-width: 1280px)').matches) setAberto(false) }} className={`flex min-h-10 items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12px] transition ${ativo ? 'bg-brand-50 font-semibold text-brand-800 dark:bg-brand-500/15 dark:text-brand-200' : 'text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-700'}`}>
                {anterior ? <CircleCheck size={19} className="shrink-0 text-emerald-600" aria-hidden="true" /> : <span aria-hidden="true" className={`grid size-[19px] shrink-0 place-items-center rounded-full text-[10px] font-bold ${ativo ? 'bg-brand-600 text-white' : 'border border-ink-300 text-ink-500 dark:border-ink-600 dark:text-ink-400'}`}>{passo.numero}</span>}
                <span className="line-clamp-2">{passo.titulo}</span>
              </a>
            </li>
          })}
        </ol>
      </nav>
    </div>
  </BlocoRecolhivel>
}
