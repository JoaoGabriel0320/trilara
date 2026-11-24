'use client'

// src/components/kb/BotaoApoiar.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TermometroApoio } from './TermometroApoio'

export function BotaoApoiar({
  ideiaId,
  totalInicial,
  maximo,
  apoiadoInicial,
}: {
  ideiaId: string
  totalInicial: number
  maximo: number
  apoiadoInicial: boolean
}) {
  const router = useRouter()
  const [total, setTotal] = useState(totalInicial)
  const [apoiado, setApoiado] = useState(apoiadoInicial)
  const [enviando, setEnviando] = useState(false)

  async function alternar() {
    if (enviando) return
    setEnviando(true)

    // Otimista: a UI muda na hora, sem esperar a rede — é um toggle de um
    // clique só, esperar o round-trip pra atualizar o número faria parecer
    // que nada aconteceu.
    const proximo = !apoiado
    setApoiado(proximo)
    setTotal((t) => t + (proximo ? 1 : -1))

    try {
      const res = await fetch(`/api/lab/${ideiaId}/apoiar`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const dados = await res.json()
      setApoiado(dados.apoiado)
      setTotal(dados.total)
      router.refresh()
    } catch {
      // reverte o otimismo se a rede falhar
      setApoiado(!proximo)
      setTotal((t) => t - (proximo ? 1 : -1))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <button
      onClick={alternar}
      disabled={enviando}
      aria-pressed={apoiado}
      className={
        'flex items-center gap-3 rounded-xl border px-4 py-2.5 transition disabled:opacity-70 ' +
        (apoiado
          ? 'border-brand-400 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20'
          : 'border-ink-200 bg-white hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800/60')
      }
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill={apoiado ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={apoiado ? 'text-brand-500' : 'text-ink-400'}
      >
        <path d="M7 22V11M2 13v7a2 2 0 0 0 2 2h12.5a2 2 0 0 0 2-1.7l1.4-9A2 2 0 0 0 18 9h-5l1-5.5a1.5 1.5 0 0 0-2.6-1.2L7 8" />
      </svg>
      <span className="text-[13.5px] font-medium text-ink-700 dark:text-ink-300">
        {apoiado ? 'Você apoia' : 'Apoiar'}
      </span>
      <TermometroApoio total={total} maximo={maximo} tamanho="lg" />
    </button>
  )
}
