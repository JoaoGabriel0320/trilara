'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { PontoSistema } from '@/components/portal/PlacaSistema'
import { TermometroApoio } from './TermometroApoio'
import { ROTULO_STATUS, COR_STATUS, ORDEM_STATUS, type StatusIdeia } from '@/lib/ideias'

export type IdeiaItem = {
  id: string
  titulo: string
  resumo: string
  status: StatusIdeia
  sistemaNome: string | null
  autorNome: string
  quando: string
  totalApoios: number
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function ListaIdeias({ ideias }: { ideias: IdeiaItem[] }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<StatusIdeia | 'TODAS'>('TODAS')

  const maximo = Math.max(1, ...ideias.map((i) => i.totalApoios))

  const filtradas = useMemo(() => {
    let lista = ideias
    if (filtro !== 'TODAS') lista = lista.filter((i) => i.status === filtro)
    const t = normalizar(busca.trim())
    if (t) {
      lista = lista.filter((i) =>
        normalizar(`${i.titulo} ${i.resumo} ${i.autorNome} ${i.sistemaNome ?? ''}`).includes(t)
      )
    }
    return lista
  }, [ideias, busca, filtro])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar uma ideia…"
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-3.5 text-[14px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800/60 dark:text-ink-50"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltro('TODAS')}
            className={
              'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ' +
              (filtro === 'TODAS'
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                : 'border-ink-200 text-ink-500 hover:border-ink-300 dark:border-ink-700 dark:text-ink-400')
            }
          >
            Todas
          </button>
          {ORDEM_STATUS.map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={
                'rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ' +
                (filtro === s
                  ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300'
                  : 'border-ink-200 text-ink-500 hover:border-ink-300 dark:border-ink-700 dark:text-ink-400')
              }
            >
              {ROTULO_STATUS[s]}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 px-6 py-10 text-center text-[14px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
          Nenhuma ideia encontrada.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtradas.map((idea) => (
            <li key={idea.id}>
              <Link
                href={`/lab/${idea.id}`}
                className="block rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-ink-800 dark:bg-ink-800/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rotulo shrink-0 rounded-full px-2 py-0.5 ${COR_STATUS[idea.status]}`}>
                        {ROTULO_STATUS[idea.status]}
                      </span>
                      {idea.sistemaNome && (
                        <span className="flex items-center gap-1.5 text-[12px] text-ink-400">
                          <PontoSistema />
                          {idea.sistemaNome}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-[15.5px] font-semibold text-ink-900 dark:text-ink-50">
                      {idea.titulo}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-600 dark:text-ink-400">
                      {idea.resumo}
                    </p>
                    <p className="rotulo mt-2.5 text-ink-400">
                      {idea.autorNome} · {idea.quando}
                    </p>
                  </div>

                  <TermometroApoio total={idea.totalApoios} maximo={maximo} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
