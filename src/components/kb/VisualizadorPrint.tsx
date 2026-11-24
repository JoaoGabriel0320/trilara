'use client'

import { useEffect, useRef, type MouseEvent } from 'react'
import { ZoomIn, X } from 'lucide-react'

export function VisualizadorPrint({ numero, tituloPasso, url, variante = 'operacao' }: { numero: number; tituloPasso: string; url: string; variante?: 'acesso' | 'operacao' }) {
  const idDialogo = `dialogo-print-${variante}-passo-${numero}`
  const idTitulo = `titulo-print-${variante}-passo-${numero}`
  const descricao = variante === 'acesso' ? 'menu de acesso' : 'tela da operação'
  const dialogo = useRef<HTMLDialogElement>(null)
  const gatilhoAtivo = useRef<HTMLButtonElement | null>(null)
  const botaoFechar = useRef<HTMLButtonElement>(null)
  const overflowAnterior = useRef('')

  useEffect(() => {
    function prepararImpressao() {
      document.querySelectorAll<HTMLImageElement>('.guia-impressao img').forEach((imagem) => { imagem.loading = 'eager' })
    }
    window.addEventListener('beforeprint', prepararImpressao)
    return () => window.removeEventListener('beforeprint', prepararImpressao)
  }, [])

  function abrir(evento: MouseEvent<HTMLButtonElement>) {
    const elemento = dialogo.current
    if (!elemento) return
    gatilhoAtivo.current = evento.currentTarget
    overflowAnterior.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    elemento.showModal()
    botaoFechar.current?.focus()
  }
  function fechar() { dialogo.current?.close() }

  return <>
    <div className="guia-midia mt-5 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={abrir}
        aria-label={`Ampliar ${descricao} do passo ${numero}`}
        aria-haspopup="dialog"
        aria-controls={idDialogo}
        className="print-passo group relative flex aspect-video w-full max-w-[680px] items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-ink-700 dark:bg-ink-900 dark:focus-visible:ring-offset-ink-800"
      >
        {/* O arquivo privado usa a sessão do navegador; o otimizador não a encaminha. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={`Print da ${descricao} do passo ${numero}: ${tituloPasso}`} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
      </button>
      <div className="flex w-full max-w-[680px] justify-end print:!hidden">
        <button
          type="button"
          onClick={abrir}
          aria-haspopup="dialog"
          aria-controls={idDialogo}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:text-brand-300 dark:focus-visible:ring-offset-ink-800"
        >
          <ZoomIn size={16} aria-hidden="true" /> Ampliar imagem
        </button>
      </div>
    </div>
    <dialog
      id={idDialogo}
      ref={dialogo}
      aria-labelledby={idTitulo}
      onCancel={(evento) => { evento.preventDefault(); fechar() }}
      onClick={(evento) => { if (evento.target === evento.currentTarget) fechar() }}
      onClose={() => { document.body.style.overflow = overflowAnterior.current; gatilhoAtivo.current?.focus() }}
      className="m-auto h-[min(92dvh,900px)] w-[min(94vw,1400px)] max-w-none overflow-hidden rounded-2xl border border-white/10 bg-ink-900 p-0 text-white shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 id={idTitulo} className="min-w-0 flex-1 truncate text-[14px] font-semibold">Passo {numero} · {descricao} · {tituloPasso}</h2>
          <button ref={botaoFechar} type="button" onClick={fechar} aria-label="Fechar visualização do print" className="grid size-11 shrink-0 place-items-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white"><X size={20} aria-hidden="true" /></button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Print ampliado da ${descricao} do passo ${numero}: ${tituloPasso}`} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      </div>
    </dialog>
  </>
}
