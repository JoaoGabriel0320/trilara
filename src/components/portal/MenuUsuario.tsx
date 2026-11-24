'use client'

// src/components/portal/MenuUsuario.tsx
//
// Popover que abre a partir do rodapé da sidebar (avatar/nome). Foi pedido
// para abrir "algo quase igual" à tela de Minha Conta — aqui é o atalho: um
// resumo do perfil mais os dois links (Minha conta / Sair), a página cheia
// fica em /conta.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AvatarColaborador } from './AvatarColaborador'

export function MenuUsuario({
  nome,
  email,
  fotoKey,
  departamento,
  colapsado,
}: {
  nome: string
  email: string
  fotoKey: string | null
  departamento: string
  colapsado: boolean
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [escuro, setEscuro] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // O tema mora aqui desde que a barra superior do portal saiu no desktop.
  // Mesma chave de localStorage do site público, então a escolha vale nos dois.
  useEffect(() => {
    setEscuro(document.documentElement.classList.contains('dark'))
  }, [])

  function alternarTema() {
    const proximo = !escuro
    setEscuro(proximo)
    document.documentElement.classList.toggle('dark', proximo)
    try {
      localStorage.setItem('theme', proximo ? 'dark' : 'light')
    } catch {
      // storage bloqueado: o tema vale só nesta aba
    }
  }

  useEffect(() => {
    if (!aberto) return
    function aoClicarFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    function aoPressionarEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('keydown', aoPressionarEsc)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('keydown', aoPressionarEsc)
    }
  }, [aberto])

  async function sair() {
    setSaindo(true)
    await fetch('/api/logout', { method: 'POST' })
    router.refresh()
    router.push('/login')
  }

  return (
    <div ref={ref} className="relative">
      {aberto && (
        <div
          className="portal-in absolute bottom-[calc(100%+8px)] left-0 z-50 w-[248px] overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-2xl dark:bg-ink-700"
          role="menu"
        >
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <AvatarColaborador nome={nome} fotoKey={fotoKey} className="h-9 w-9 rounded-full text-[12px]" />
            <div className="min-w-0">
              <p className="truncate text-[13.5px] font-medium text-white">{nome}</p>
              <p className="truncate text-[12px] text-ink-500">{email}</p>
            </div>
          </div>
          {departamento && (
            <div className="px-3.5 pb-3">
              <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[11.5px] font-medium text-ink-200">
                {departamento}
              </span>
            </div>
          )}

          <div className="h-px bg-white/10" />

          <Link
            href="/conta"
            role="menuitem"
            onClick={() => setAberto(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13.5px] text-ink-300 transition hover:bg-white/5 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.5 20c1.4-3.6 4.4-5.6 7.5-5.6s6.1 2 7.5 5.6" />
            </svg>
            Minha conta
          </Link>

          <button
            onClick={alternarTema}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-ink-300 transition hover:bg-white/5 hover:text-white"
          >
            {escuro ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />
              </svg>
            )}
            {escuro ? 'Tema claro' : 'Tema escuro'}
          </button>

          <div className="h-px bg-white/10" />

          <button
            onClick={sair}
            disabled={saindo}
            role="menuitem"
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] text-ink-300 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
              <path d="m17 15 3-3-3-3M20 12H10" />
            </svg>
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}

      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        title={colapsado ? nome : undefined}
        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/5"
      >
        <AvatarColaborador nome={nome} fotoKey={fotoKey} className="h-7 w-7 rounded-lg text-[10.5px]" />
        {!colapsado && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-[13px] text-ink-300">{nome}</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-500">
              <path d="m6 9 6-6 6 6" />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}
