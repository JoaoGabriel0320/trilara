'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type OpcoesConfirmacao = {
  titulo: string
  mensagem: string
  acao: string
  perigo?: boolean
}

export function useConfirmacao() {
  const [pendente, setPendente] = useState<OpcoesConfirmacao | null>(null)
  const resolver = useRef<((confirmado: boolean) => void) | null>(null)
  const cancelarRef = useRef<HTMLButtonElement>(null)

  useBloqueioRolagemConfirmacao(Boolean(pendente))

  const fechar = useCallback((confirmado: boolean) => {
    resolver.current?.(confirmado)
    resolver.current = null
    setPendente(null)
  }, [])

  const confirmar = useCallback((opcoes: OpcoesConfirmacao) => {
    if (resolver.current) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setPendente(opcoes)
    })
  }, [])

  useEffect(() => {
    if (!pendente) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelarRef.current?.focus()

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { evento.preventDefault(); fechar(false) }
      if (evento.key !== 'Tab') return
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-confirmacao] button:not(:disabled)')
      const primeiro = botoes[0]
      const ultimo = botoes[botoes.length - 1]
      if (!primeiro || !ultimo) return
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }

    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [pendente, fechar])

  useEffect(() => () => { resolver.current?.(false); resolver.current = null }, [])

  const modal = pendente && createPortal(
    <div className={FUNDO_MODAL_CONFIRMACAO}>
      <div data-modal-confirmacao role="alertdialog" aria-modal="true" aria-labelledby="titulo-modal-confirmacao" aria-describedby="descricao-modal-confirmacao" className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800">
        <h2 id="titulo-modal-confirmacao" className="text-lg font-semibold text-ink-900 dark:text-white">{pendente.titulo}</h2>
        <p id="descricao-modal-confirmacao" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{pendente.mensagem}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={cancelarRef} type="button" onClick={() => fechar(false)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 dark:border-ink-700 dark:text-ink-200">Cancelar</button>
          <button type="button" onClick={() => fechar(true)} className={`min-h-11 rounded-xl px-5 text-sm font-semibold text-white ${pendente.perigo ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-500 hover:bg-brand-600'}`}>{pendente.acao}</button>
        </div>
      </div>
    </div>,
    document.body
  )

  return { confirmar, modal }
}
