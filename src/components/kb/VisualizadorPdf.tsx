'use client'

// src/components/kb/VisualizadorPdf.tsx
//
// O PDF abre em tela cheia sob demanda. Na página, o cartão destaca o arquivo
// e deixa as ações de visualizar e baixar acessíveis sem carregar um iframe.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Eye, FileText, X } from 'lucide-react'

/** 2 621 440 → "2,5 MB". Sem essa formatação o tamanho não diz nada a quem lê. */
function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  return `${(kb / 1024).toFixed(1).replace('.', ',')} MB`
}

function Lightbox({
  src,
  titulo,
  onFechar,
}: {
  src: string
  titulo: string
  onFechar: () => void
}) {
  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    // Trava o scroll da página por trás enquanto o PDF ocupa a tela.
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [onFechar])

  return createPortal(
    <div className="mobile-lightbox fixed inset-0 z-[60] flex flex-col bg-ink-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-3 border-b border-white/10 bg-ink-900 px-4 py-3 sm:px-6">
        <FileText className="size-[18px] shrink-0 text-ink-400" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-white">{titulo}</p>
        <a
          aria-label="Baixar PDF"
          href={`${src}?download=1`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <Download className="size-4" aria-hidden />
          <span className="hidden sm:inline">Baixar</span>
        </a>
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="grid size-11 sm:size-8 shrink-0 place-items-center rounded-lg text-ink-300 transition hover:bg-white/10 hover:text-white"
        >
          <X className="size-[18px]" aria-hidden />
        </button>
      </div>

      <a href={src} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center bg-ink-800 px-4 text-sm text-white underline sm:hidden">Abrir PDF em outra aba</a>
      <iframe src={src} title={titulo} className="min-h-0 flex-1 bg-ink-100" />
    </div>,
    document.body
  )
}

export function VisualizadorPdf({
  id,
  nomeArquivo,
  tamanhoBytes,
}: {
  id: string
  nomeArquivo: string
  tamanhoBytes: number | null
}) {
  const [aberto, setAberto] = useState(false)
  const src = `/api/documentos/${id}/arquivo`

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-white p-5 dark:border-brand-900 dark:from-brand-500/10 dark:via-ink-800 dark:to-ink-800 sm:p-8">
        <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border-[26px] border-brand-100/60 dark:border-brand-500/10" />
        <div className="relative flex flex-wrap items-start gap-5">
          <span className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/20">
            <FileText size={31} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 basis-44">
            <p className="rotulo text-brand-600 dark:text-brand-400">Manual em PDF</p>
            <p className="mt-2 break-all text-[17px] font-semibold leading-snug text-ink-900 dark:text-ink-50">{nomeArquivo}</p>
            <p className="mt-2 text-[13px] text-ink-500 dark:text-ink-400">
              {tamanhoBytes ? formatarTamanho(tamanhoBytes) : 'Arquivo PDF'} · Disponível para consulta
            </p>
          </div>
        </div>

        <div className="relative mt-5 flex flex-col sm:flex-row sm:flex-wrap gap-3 border-t border-brand-100 pt-6 dark:border-ink-700">
          <button
            onClick={() => setAberto(true)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 sm:flex-none"
          >
            <Eye size={18} aria-hidden="true" />
            Visualizar manual
          </button>
          <a
            href={`${src}?download=1`}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-6 py-3 text-[15px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:border-brand-500 dark:hover:text-brand-400 sm:flex-none"
          >
            <Download size={18} aria-hidden="true" />
            Baixar PDF
          </a>
        </div>
      </div>

      {aberto && <Lightbox src={src} titulo={nomeArquivo} onFechar={() => setAberto(false)} />}
    </>
  )
}
