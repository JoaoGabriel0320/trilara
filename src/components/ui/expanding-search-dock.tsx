'use client'

// src/components/ui/expanding-search-dock.tsx
//
// Campo de busca que nasce como um botão redondo e se abre numa pílula com
// input. Adaptado do "expanding-search-dock" do shadcn/21st com três mudanças:
// - Cores em ink-*/brand-* em vez de bg-card/border-border/text-muted-foreground:
//   este projeto não define os tokens semânticos do shadcn.
// - Aceita modo controlado (`expandido` + `aoMudarExpandido`). A paleta de busca
//   usa isso para que o X feche o overlay inteiro em vez de só recolher o campo.
// - `larguraExpandida` aceita '100%': o framer-motion converte de px para % ao
//   animar width, então o campo cresce até ocupar o contêiner.

import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type ExpandingSearchDockProps = {
  /** Enter no campo. */
  aoBuscar?: (termo: string) => void
  /** Cada tecla digitada — para filtrar ao vivo. */
  aoDigitar?: (termo: string) => void
  placeholder?: string
  /** Modo controlado. Sem ele o componente guarda o próprio estado. */
  expandido?: boolean
  aoMudarExpandido?: (expandido: boolean) => void
  larguraExpandida?: number | string
  /** Repassado ao <input>: onKeyDown, aria-*, id… */
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>
  className?: string
}

export function ExpandingSearchDock({
  aoBuscar,
  aoDigitar,
  placeholder = 'Buscar…',
  expandido,
  aoMudarExpandido,
  larguraExpandida = 320,
  inputProps,
  className,
}: ExpandingSearchDockProps) {
  const [expandidoInterno, setExpandidoInterno] = useState(false)
  const [termo, setTermo] = useState('')
  const aberto = expandido ?? expandidoInterno

  function mudar(proximo: boolean) {
    if (expandido === undefined) setExpandidoInterno(proximo)
    aoMudarExpandido?.(proximo)
  }

  function recolher() {
    mudar(false)
    setTermo('')
    aoDigitar?.('')
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (aoBuscar && termo.trim()) aoBuscar(termo.trim())
  }

  return (
    <div className={cn('relative', className)}>
      <AnimatePresence mode="wait">
        {!aberto ? (
          <motion.button
            key="icone"
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => mudar(true)}
            aria-label="Abrir busca"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-sm transition-colors hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 dark:hover:bg-ink-700"
          >
            <Search className="h-5 w-5" />
          </motion.button>
        ) : (
          <motion.form
            key="campo"
            role="search"
            initial={{ width: 48, opacity: 0 }}
            animate={{ width: larguraExpandida, opacity: 1 }}
            exit={{ width: 48, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onSubmit={enviar}
            className="relative max-w-full"
          >
            <motion.div
              initial={{ backdropFilter: 'blur(0px)' }}
              animate={{ backdropFilter: 'blur(12px)' }}
              className="relative flex items-center gap-2 overflow-hidden rounded-full border border-ink-200 bg-white/90 shadow-xl shadow-ink-900/10 backdrop-blur-md transition-colors focus-within:border-brand-500 dark:border-ink-700 dark:bg-ink-800/85 dark:shadow-black/40"
            >
              <div className="ml-4 shrink-0">
                <Search className="h-4 w-4 text-brand-500" />
              </div>
              <input
                type="text"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                placeholder={placeholder}
                {...inputProps}
                value={termo}
                onChange={(e) => {
                  setTermo(e.target.value)
                  aoDigitar?.(e.target.value)
                }}
                // outline-none sozinho não basta: o `*:focus-visible` global (globals.css)
                // ganharia e desenharia um contorno roxo dentro da pílula. O destaque
                // do foco fica na borda da pílula (focus-within), não no input.
                className="h-12 min-w-0 flex-1 bg-transparent pr-2 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none focus-visible:outline-none dark:text-ink-50"
              />
              <motion.button
                type="button"
                onClick={recolher}
                aria-label="Fechar busca"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="mr-1 flex h-11 w-11 sm:mr-2 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-700 dark:hover:text-ink-50 dark:focus-visible:bg-ink-700"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
