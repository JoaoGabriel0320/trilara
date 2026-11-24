'use client'

// src/components/kb/SenhaTemporaria.tsx
//
// Painel que revela uma senha gerada pelo servidor — na criação de um
// colaborador ou num reset. É a ÚNICA vez que ela aparece: não fica salva em
// nenhum lugar em texto puro, então se o admin fechar isto sem copiar, o
// jeito de recuperar é gerar outra (Resetar senha de novo).

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export function SenhaTemporaria({
  senha,
  nomeColaborador,
  onFechar,
}: {
  senha: string
  nomeColaborador: string
  onFechar: () => void
}) {
  const [copiada, setCopiada] = useState(false)
  const [montado, setMontado] = useState(false)

  // Renderizado direto no <body> (portal): assim o fundo escuro cobre a janela
  // inteira seja qual for o componente que abriu o painel — um ancestral com
  // transform, overflow ou z-index próprio não consegue mais recortá-lo.
  useEffect(() => setMontado(true), [])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(senha)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch {
      // clipboard bloqueado (http sem permissão, navegador antigo) — o admin
      // ainda consegue selecionar o texto manualmente, não é um erro fatal
    }
  }

  if (!montado) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-900/60 p-5 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="senha-temporaria-titulo"
        className="mobile-modal portal-in w-full max-w-[400px] rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800"
      >
        <div className="mb-1 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span id="senha-temporaria-titulo" className="rotulo">Senha temporária gerada</span>
        </div>
        <p className="text-[14px] text-ink-600 dark:text-ink-400">
          Entregue esta senha para <strong className="text-ink-900 dark:text-ink-50">{nomeColaborador}</strong>. No
          primeiro acesso o sistema pede uma senha nova. Esta senha não aparece de novo depois que você fechar.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-700 dark:bg-ink-900">
          <span className="flex-1 select-all font-mono text-[16px] tracking-wide text-ink-900 dark:text-ink-50">
            {senha}
          </span>
          <button
            onClick={copiar}
            className="shrink-0 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12.5px] font-medium text-ink-600 transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300 dark:hover:text-brand-400"
          >
            {copiada ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        <button
          onClick={onFechar}
          className="mt-5 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-600"
        >
          Já entreguei, fechar
        </button>
      </div>
    </div>,
    document.body
  )
}
