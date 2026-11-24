'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Expand, Images, X } from 'lucide-react'

interface ImagemDocumento {
  id: string
  arquivoNome: string
  url: string
}

const IMAGENS_POR_PAGINA = 4

export function GaleriaImagensDocumento({ imagens }: { imagens: ImagemDocumento[] }) {
  const [indiceAberto, setIndiceAberto] = useState<number | null>(null)
  const [pagina, setPagina] = useState(0)
  const modalRef = useRef<HTMLDivElement>(null)
  const botaoFecharRef = useRef<HTMLButtonElement>(null)
  const aberto = indiceAberto !== null

  useEffect(() => {
    if (!aberto) return

    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    botaoFecharRef.current?.focus()

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        setIndiceAberto(null)
      } else if (evento.key === 'ArrowLeft' && imagens.length > 1) {
        evento.preventDefault()
        setIndiceAberto((indice) => indice === null ? null : (indice - 1 + imagens.length) % imagens.length)
      } else if (evento.key === 'ArrowRight' && imagens.length > 1) {
        evento.preventDefault()
        setIndiceAberto((indice) => indice === null ? null : (indice + 1) % imagens.length)
      } else if (evento.key === 'Tab') {
        const botoes = modalRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
        if (!botoes?.length) return
        const primeiro = botoes[0]
        const ultimo = botoes[botoes.length - 1]

        if (evento.shiftKey && (document.activeElement === primeiro || !modalRef.current?.contains(document.activeElement))) {
          evento.preventDefault()
          ultimo.focus()
        } else if (!evento.shiftKey && (document.activeElement === ultimo || !modalRef.current?.contains(document.activeElement))) {
          evento.preventDefault()
          primeiro.focus()
        }
      }
    }

    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      focoAnterior?.focus()
    }
  }, [aberto, imagens.length])

  if (imagens.length === 0) return null

  const imagemAberta = indiceAberto === null ? null : imagens[indiceAberto]
  const totalPaginas = Math.ceil(imagens.length / IMAGENS_POR_PAGINA)
  const paginaAtual = Math.min(pagina, totalPaginas - 1)
  const indiceInicial = paginaAtual * IMAGENS_POR_PAGINA
  const imagensVisiveis = imagens.slice(indiceInicial, indiceInicial + IMAGENS_POR_PAGINA)
    .map((imagem, indiceNaPagina) => ({ imagem, indice: indiceInicial + indiceNaPagina }))

  return (
    <>
      <div className={imagens.length === 1 ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2'}>
        {imagensVisiveis.map(({ imagem, indice }) => (
          <button
            key={imagem.id}
            type="button"
            onClick={() => setIndiceAberto(indice)}
            aria-label={`Ampliar print ${indice + 1}: ${imagem.arquivoNome}`}
            className="group overflow-hidden rounded-2xl border border-ink-200 bg-white text-left shadow-sm transition hover:border-brand-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:border-ink-700 dark:bg-ink-800 dark:hover:border-brand-500"
          >
            <span className="relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-ink-50 dark:bg-ink-900">
              {/* O arquivo privado usa a sessão do navegador; o otimizador de imagens não encaminha essa sessão. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagem.url} alt={`Print ${indice + 1}: ${imagem.arquivoNome}`} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]" />
              <span className="absolute bottom-3 right-3 grid size-11 sm:size-9 place-items-center rounded-lg bg-white/95 text-ink-700 shadow-sm dark:bg-ink-800/95 dark:text-ink-200">
                <Expand size={17} aria-hidden="true" />
              </span>
            </span>
            <span className="flex items-center gap-3 px-4 py-3">
              <Images size={17} className="shrink-0 text-brand-500" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-800 dark:text-ink-200">{imagem.arquivoNome}</span>
              <span className="text-[12px] tabular-nums text-ink-400">{indice + 1}/{imagens.length}</span>
            </span>
          </button>
        ))}
      </div>

      {totalPaginas > 1 && (
        <nav aria-label="Navegar pelos prints do documento" className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span aria-live="polite" className="text-[13px] tabular-nums text-ink-500 dark:text-ink-400">
            {indiceInicial + 1}–{Math.min(indiceInicial + IMAGENS_POR_PAGINA, imagens.length)} de {imagens.length} imagens
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPagina(Math.max(0, paginaAtual - 1))}
              disabled={paginaAtual === 0}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 text-[13px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-200"
            >
              <ChevronLeft size={17} aria-hidden="true" /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPagina(Math.min(totalPaginas - 1, paginaAtual + 1))}
              disabled={paginaAtual === totalPaginas - 1}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-ink-200 px-3.5 text-[13px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-200"
            >
              Próximas <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}

      {imagemAberta && createPortal(
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-print-ampliado"
          className="mobile-lightbox fixed inset-0 z-[70] flex flex-col bg-ink-900/95 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3 border-b border-white/10 bg-ink-900 px-4 py-3 sm:px-6">
            <Images size={18} className="shrink-0 text-ink-400" aria-hidden="true" />
            <p id="titulo-print-ampliado" className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">{imagemAberta.arquivoNome}</p>
            <span className="shrink-0 text-[13px] tabular-nums text-ink-400">{indiceAberto! + 1} de {imagens.length}</span>
            <button
              ref={botaoFecharRef}
              type="button"
              onClick={() => setIndiceAberto(null)}
              aria-label="Fechar visualização do print"
              className="ml-2 grid size-11 sm:size-9 shrink-0 place-items-center rounded-lg text-ink-300 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagemAberta.url} alt={`Print ${indiceAberto! + 1}: ${imagemAberta.arquivoNome}`} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
          </div>

          {imagens.length > 1 && (
            <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-ink-900 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setIndiceAberto((indice) => indice === null ? null : (indice - 1 + imagens.length) % imagens.length)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-ink-200 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ChevronLeft size={18} aria-hidden="true" /> Anterior
              </button>
              <span className="hidden text-[13px] text-ink-400 sm:inline">Use as setas do teclado para navegar</span>
              <button
                type="button"
                onClick={() => setIndiceAberto((indice) => indice === null ? null : (indice + 1) % imagens.length)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-[13px] font-medium text-ink-200 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Próximo <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
