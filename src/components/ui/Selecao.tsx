'use client'

// src/components/ui/Selecao.tsx
//
// Combobox estilizado no lugar do <select> nativo — o nativo renderiza a lista
// com o tema do sistema operacional, então nunca fica igual ao resto do
// formulário (borda quadrada, sem foco roxo, etc). Este componente é o
// substituto padrão para qualquer seleção de uma lista curta na área logada.

import { useEffect, useMemo, useRef, useState } from 'react'

export type OpcaoSelecao = { value: string; label: string; descricao?: string }

export function Selecao({
  opcoes,
  valor,
  onChange,
  placeholder = 'Selecione…',
  buscavel = false,
  disabled = false,
  tamanho = 'padrao',
  rotuloId,
}: {
  opcoes: OpcaoSelecao[]
  valor: string
  onChange: (valor: string) => void
  placeholder?: string
  /** Mostra um campo de busca no topo do painel — vale a pena a partir de ~8 opções. */
  buscavel?: boolean
  disabled?: boolean
  tamanho?: 'padrao' | 'grande'
  rotuloId?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [ativoIdx, setAtivoIdx] = useState(-1)
  const [paraCima, setParaCima] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const inputBusca = useRef<HTMLInputElement>(null)

  // Altura aproximada do painel aberto (busca + lista + bordas) — não dá pra
  // medir o real antes de montar, então uma estimativa generosa é o bastante
  // pra decidir de que lado tem espaço.
  const ALTURA_PAINEL_ESTIMADA = 280

  const selecionada = opcoes.find((o) => o.value === valor) ?? null

  const filtradas = useMemo(() => {
    if (!buscavel || !busca.trim()) return opcoes
    const t = busca
      .trim()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
    return opcoes.filter((o) =>
      o.label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .includes(t)
    )
  }, [opcoes, busca, buscavel])

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) fechar()
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [aberto])

  useEffect(() => {
    if (aberto && buscavel) inputBusca.current?.focus()
  }, [aberto, buscavel])

  function abrir() {
    if (disabled) return
    setBusca('')
    setAtivoIdx(Math.max(0, filtradas.findIndex((o) => o.value === valor)))

    // Decide o lado antes de abrir: se o espaço abaixo do campo não cabe o
    // painel mas o de cima cabe, abre pra cima — é o que evita o painel
    // sair cortado quando o campo está perto do fim da tela (rodapé de
    // formulário, último campo antes do botão).
    const rect = raiz.current?.getBoundingClientRect()
    if (rect) {
      const espacoAbaixo = window.innerHeight - rect.bottom
      const espacoAcima = rect.top
      setParaCima(espacoAbaixo < ALTURA_PAINEL_ESTIMADA && espacoAcima > espacoAbaixo)
    }

    setAberto(true)
  }

  function fechar() {
    setAberto(false)
    setAtivoIdx(-1)
  }

  function escolher(opcao: OpcaoSelecao) {
    onChange(opcao.value)
    fechar()
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (!aberto) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        abrir()
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      fechar()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAtivoIdx((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivoIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtradas[ativoIdx]) escolher(filtradas[ativoIdx])
    }
  }

  return (
    <div ref={raiz} className="relative" onKeyDown={aoTeclar}>
      <button
        type="button"
        onClick={() => (aberto ? fechar() : abrir())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-labelledby={rotuloId}
        className={
          'flex min-w-0 w-full items-center justify-between gap-2 rounded-xl border bg-ink-50 text-left outline-none transition dark:bg-ink-900 ' +
          (tamanho === 'grande' ? 'mt-2 min-h-12 px-4 py-3 text-[15px] ' : 'mt-1.5 px-3.5 py-2.5 text-[14px] ') +
          (disabled ? 'cursor-not-allowed opacity-60 ' : '') +
          (aberto
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : 'border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600')
        }
      >
        <span className={selecionada ? 'truncate text-ink-900 dark:text-ink-50' : 'truncate text-ink-400'}>
          {selecionada?.label ?? placeholder}
        </span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 text-ink-400 transition-transform"
          style={{ transform: aberto ? 'rotate(180deg)' : undefined }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-labelledby={rotuloId}
          className={
            'portal-in absolute left-0 right-0 z-30 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-800 ' +
            (paraCima ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]')
          }
        >
          {buscavel && (
            <div className="border-b border-ink-200 p-2 dark:border-ink-700">
              <input
                ref={inputBusca}
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value)
                  setAtivoIdx(0)
                }}
                placeholder="Buscar…"
                className="w-full rounded-lg bg-ink-100 px-2.5 py-1.5 text-[13px] text-ink-900 outline-none placeholder:text-ink-400 dark:bg-ink-900 dark:text-ink-50"
              />
            </div>
          )}

          <ul className="scroll-thin max-h-[min(220px,40dvh)] overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <li className="px-3.5 py-2.5 text-[13.5px] text-ink-400">Nada encontrado.</li>
            ) : (
              filtradas.map((opcao, i) => {
                const selecionado = opcao.value === valor
                const emFoco = i === ativoIdx
                return (
                  <li key={opcao.value} role="option" aria-selected={selecionado}>
                    <button
                      type="button"
                      onMouseEnter={() => setAtivoIdx(i)}
                      onClick={() => escolher(opcao)}
                      className={
                        'flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13.5px] transition ' +
                        (selecionado
                          ? 'bg-brand-500 text-white'
                          : emFoco
                            ? 'bg-ink-100 text-ink-900 dark:bg-ink-700/60 dark:text-ink-50'
                            : 'text-ink-700 dark:text-ink-300')
                      }
                    >
                      <span className="truncate">{opcao.label}</span>
                      {selecionado && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
