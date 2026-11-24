'use client'

import { useId, useRef } from 'react'
import { X } from 'lucide-react'

type RespostaAvaliacaoProps = {
  sistema: string
  nota: number
  data: string
  autor: string
  respostas: {
    gosta: string | null
    melhorar: string | null
    gostaria: string | null
  }
}

export function RespostaAvaliacao({ sistema, nota, data, autor, respostas }: RespostaAvaliacaoProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const tituloId = useId()
  const campos = [
    { titulo: 'O que gosta', resposta: respostas.gosta },
    { titulo: 'O que pode melhorar', resposta: respostas.melhorar },
    { titulo: 'O que gostaria que tivesse', resposta: respostas.gostaria },
  ]

  return (
    <article className="min-w-0 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-ink-900 dark:text-ink-50">{sistema}</span>
          <span className="ml-3 text-amber-500" aria-label={`${nota} de 5 estrelas`}>
            {'★'.repeat(nota)}<span className="text-ink-300 dark:text-ink-600">{'☆'.repeat(5 - nota)}</span>
          </span>
        </div>
        <span className="text-xs text-ink-400">{data}</span>
      </div>
      <p className="mt-1 break-words text-xs text-ink-500 dark:text-ink-400">{autor}</p>
      <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
        {campos.map(({ titulo, resposta }) => (
          <div key={titulo} className="min-w-0 rounded-r-lg border-l-2 border-brand-300 bg-ink-50 px-4 py-3 dark:border-brand-500 dark:bg-ink-900/40">
            <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{titulo}</p>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap [overflow-wrap:anywhere] text-ink-800 dark:text-ink-100">{resposta || '—'}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={() => dialogRef.current?.showModal()} className="rounded-lg px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:text-brand-300 dark:hover:bg-ink-700">
          Ver detalhes
        </button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={tituloId}
        onClick={(evento) => { if (evento.target === evento.currentTarget) evento.currentTarget.close() }}
        className="mobile-modal m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-ink-200 bg-white p-0 text-ink-900 shadow-2xl backdrop:bg-ink-950/60 backdrop:backdrop-blur-sm dark:border-ink-700 dark:bg-ink-800 dark:text-ink-50"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-ink-200 bg-white px-5 py-4 dark:border-ink-700 dark:bg-ink-800">
          <div className="min-w-0">
            <h3 id={tituloId} className="text-lg font-semibold">{sistema} · Resposta completa</h3>
            <p className="mt-1 break-words text-xs text-ink-500 dark:text-ink-400">{autor} · {data} · {nota} de 5 estrelas</p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Fechar detalhes" className="shrink-0 rounded-lg p-2 text-ink-500 hover:bg-ink-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:text-ink-300 dark:hover:bg-ink-700">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          {campos.map(({ titulo, resposta }) => (
            <section key={titulo} className="min-w-0 rounded-r-lg border-l-2 border-brand-300 bg-ink-50 px-4 py-3 dark:border-brand-500 dark:bg-ink-900/40">
              <h4 className="text-xs font-medium text-ink-500 dark:text-ink-400">{titulo}</h4>
              <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-ink-800 dark:text-ink-100">{resposta || '—'}</p>
            </section>
          ))}
        </div>
      </dialog>
    </article>
  )
}
