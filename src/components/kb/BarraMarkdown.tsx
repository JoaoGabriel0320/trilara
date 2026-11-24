'use client'

import { Bold, Italic, Link, List } from 'lucide-react'
import { aplicarMarcacao, type AcaoMarkdown } from '@/lib/markdown-edicao'

export function BarraMarkdown({
  numeroPasso,
  alvo,
  aoAplicar,
  desabilitado,
}: {
  numeroPasso: number
  alvo: React.RefObject<HTMLTextAreaElement>
  aoAplicar: (resultado: { valor: string; inicio: number; fim: number }) => void
  desabilitado: boolean
}) {
  function aplicar(acao: AcaoMarkdown) {
    const textarea = alvo.current
    if (!textarea) return
    const resultado = aplicarMarcacao(textarea.value, textarea.selectionStart, textarea.selectionEnd, acao)
    aoAplicar(resultado)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(resultado.inicio, resultado.fim)
    })
  }

  const botoes = [
    { acao: 'negrito' as const, rotulo: 'Negrito', Icone: Bold },
    { acao: 'italico' as const, rotulo: 'Itálico', Icone: Italic },
    { acao: 'lista' as const, rotulo: 'Lista', Icone: List },
    { acao: 'link' as const, rotulo: 'Link', Icone: Link },
  ]

  return <div role="group" aria-label={`Formatação do texto do passo ${numeroPasso}`} className="flex flex-wrap gap-1 rounded-t-xl border border-b-0 border-ink-200 bg-ink-50 p-1.5 dark:border-ink-700 dark:bg-ink-900">
    {botoes.map(({ acao, rotulo, Icone }) => <button
      key={acao}
      type="button"
      title={rotulo}
      aria-label={`${rotulo} no texto do passo ${numeroPasso}`}
      disabled={desabilitado}
      onClick={() => aplicar(acao)}
      className="grid size-9 place-items-center rounded-lg text-ink-500 transition hover:bg-white hover:text-brand-600 disabled:opacity-50 dark:text-ink-400 dark:hover:bg-ink-700 dark:hover:text-brand-300"
    ><Icone size={17} aria-hidden="true" /></button>)}
  </div>
}
