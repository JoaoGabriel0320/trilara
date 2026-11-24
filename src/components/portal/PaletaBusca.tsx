'use client'

// src/components/portal/PaletaBusca.tsx
//
// Busca em overlay, aberta pelo "Buscar" da sidebar ou por ⌘K/Ctrl+K em
// qualquer página do portal. O fundo desfoca para a pessoa não perder o lugar
// onde estava: fechar (Esc, X, clique fora) devolve exatamente a mesma tela.
//
// O índice vem de /api/documentos/busca a cada abertura. A lista anterior fica
// na tela enquanto a nova chega, então só a primeira abertura mostra
// "Carregando". O filtro é o mesmo da página inicial (normalizar, sem acento).

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExpandingSearchDock } from '@/components/ui/expanding-search-dock'
import { cn } from '@/lib/utils'
import { ICONE_TIPO, ROTULO_TIPO, normalizar, textoDeBusca, type DocumentoBusca } from './BuscaGlobal'

const RECENTES = 6
const ID_LISTA = 'paleta-busca-resultados'

function destinoDe(doc: DocumentoBusca) {
  const externo = doc.tipo === 'LINK' && !!doc.urlExterna
  return { externo, href: externo ? doc.urlExterna! : `/documentacao/${doc.sistemaSlug}/${doc.slug}` }
}

export function PaletaBusca({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const [documentos, setDocumentos] = useState<DocumentoBusca[] | null>(null)
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState(0)
  const focoAnterior = useRef<HTMLElement | null>(null)
  const termo = busca.trim()

  // Abriu: zera o campo, trava a rolagem da página de trás e guarda quem
  // tinha o foco para devolver ao fechar (o botão "Buscar", normalmente).
  useEffect(() => {
    if (!aberta) return
    setBusca('')
    setSelecionado(0)
    focoAnterior.current = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      focoAnterior.current?.focus?.()
    }
  }, [aberta])

  useEffect(() => {
    if (!aberta) return
    const controle = new AbortController()
    setErro(false)
    fetch('/api/documentos/busca', { signal: controle.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((dados: { documentos: DocumentoBusca[] }) => setDocumentos(dados.documentos))
      .catch((e) => {
        if (e?.name !== 'AbortError') setErro(true)
      })
    return () => controle.abort()
  }, [aberta, tentativa])

  useEffect(() => {
    if (!aberta) return
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberta, aoFechar])

  // Navegou (clique num resultado, voltar do navegador): o overlay sai junto.
  useEffect(() => {
    aoFechar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const lista = useMemo(() => {
    if (!documentos) return []
    if (!termo) return documentos.slice(0, RECENTES)
    const t = normalizar(termo)
    return documentos.filter((d) => normalizar(textoDeBusca(d)).includes(t))
  }, [documentos, termo])

  useEffect(() => {
    document.getElementById(`paleta-item-${selecionado}`)?.scrollIntoView({ block: 'nearest' })
  }, [selecionado])

  function abrir(doc: DocumentoBusca) {
    const { externo, href } = destinoDe(doc)
    if (externo) window.open(href, '_blank', 'noopener,noreferrer')
    else router.push(href)
    aoFechar()
  }

  function aoTeclarNoCampo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!lista.length) return
      const passo = e.key === 'ArrowDown' ? 1 : -1
      setSelecionado((i) => (i + passo + lista.length) % lista.length)
    } else if (e.key === 'Enter') {
      // Enter abre o item destacado — inclusive com o campo vazio, sobre os recentes.
      e.preventDefault()
      const doc = lista[selecionado]
      if (doc) abrir(doc)
    }
  }

  const carregando = !documentos && !erro

  return (
    <AnimatePresence>
      {aberta && (
        <motion.div
          key="paleta-busca"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="mobile-search fixed inset-0 z-[60] flex justify-center px-4 pt-[12vh] sm:pt-[16vh]"
        >
          <div
            aria-hidden="true"
            onClick={aoFechar}
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-md dark:bg-black/55"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Buscar na documentação"
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative flex h-fit w-full max-w-[640px] flex-col items-center"
          >
            <ExpandingSearchDock
              expandido
              aoMudarExpandido={(v) => !v && aoFechar()}
              aoDigitar={(v) => {
                setBusca(v)
                setSelecionado(0)
              }}
              larguraExpandida="100%"
              placeholder="Buscar manual, procedimento ou sistema"
              className="flex w-full justify-center"
              inputProps={{
                id: 'paleta-busca',
                'aria-label': 'Buscar na documentação',
                role: 'combobox',
                'aria-expanded': lista.length > 0,
                'aria-controls': ID_LISTA,
                'aria-autocomplete': 'list',
                'aria-activedescendant': lista.length ? `paleta-item-${selecionado}` : undefined,
                onKeyDown: aoTeclarNoCampo,
              }}
            />

            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.2 }}
              className="mt-3 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white/95 shadow-2xl shadow-ink-900/15 backdrop-blur-xl dark:border-ink-700 dark:bg-ink-800/95 dark:shadow-black/50"
            >
              <p className="rotulo border-b border-ink-200 px-5 py-3 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                {termo
                  ? `${lista.length} ${lista.length === 1 ? 'resultado' : 'resultados'}`
                  : 'Atualizados recentemente'}
              </p>

              {carregando ? (
                <div className="flex items-center justify-center gap-2 px-6 py-10 text-[14px] text-ink-500 dark:text-ink-400">
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  Carregando documentos…
                </div>
              ) : erro && !documentos ? (
                <div className="px-6 py-10 text-center text-[14px] text-ink-500 dark:text-ink-400">
                  Não foi possível carregar a busca.{' '}
                  <button
                    type="button"
                    onClick={() => setTentativa((n) => n + 1)}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Tentar de novo
                  </button>
                </div>
              ) : lista.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-[15px] font-medium text-ink-800 dark:text-ink-100">
                    {termo ? `Nada encontrado para “${termo}”` : 'Nenhum documento publicado ainda'}
                  </p>
                  {termo && (
                    <p className="mt-1 text-[13.5px] text-ink-500 dark:text-ink-400">
                      Tente o nome do sistema ou outra palavra do título.
                    </p>
                  )}
                </div>
              ) : (
                <ul id={ID_LISTA} role="listbox" className="mobile-search-results scroll-thin max-h-[min(52vh,420px)] overflow-y-auto p-1.5">
                  {lista.map((doc, i) => {
                    const { externo, href } = destinoDe(doc)
                    const Icone = ICONE_TIPO[doc.tipo]
                    const ativo = i === selecionado
                    const classes = cn(
                      'flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 transition-colors',
                      ativo ? 'bg-brand-500/10 dark:bg-brand-500/15' : 'hover:bg-ink-50 dark:hover:bg-ink-700/40'
                    )
                    const conteudo = (
                      <>
                        <span
                          className={cn(
                            'grid size-9 shrink-0 place-items-center rounded-lg transition-colors',
                            ativo
                              ? 'bg-brand-500 text-white'
                              : 'bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300'
                          )}
                        >
                          <Icone className="size-[18px]" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-medium text-ink-900 dark:text-ink-50">
                            {doc.titulo}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-ink-500 dark:text-ink-400">
                            {doc.sistemaNome}
                            {doc.categoriaNome && ` · ${doc.categoriaNome}`} · {ROTULO_TIPO[doc.tipo]}
                          </span>
                        </span>
                        <span className="hidden shrink-0 text-[12.5px] text-ink-400 sm:block">{doc.quando}</span>
                        {externo && <ExternalLink className="size-3.5 shrink-0 text-ink-400" aria-hidden />}
                      </>
                    )

                    return (
                      <li
                        key={doc.id}
                        id={`paleta-item-${i}`}
                        role="option"
                        aria-selected={ativo}
                        onMouseMove={() => !ativo && setSelecionado(i)}
                      >
                        {externo ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" onClick={aoFechar} tabIndex={-1} className={classes}>
                            {conteudo}
                          </a>
                        ) : (
                          <Link href={href} onClick={aoFechar} tabIndex={-1} className={classes}>
                            {conteudo}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <div className="hidden items-center gap-4 border-t border-ink-200 px-5 py-2.5 text-[12px] text-ink-400 dark:border-ink-700 sm:flex">
                <span>
                  <kbd className="font-sans">↑</kbd> <kbd className="font-sans">↓</kbd> navegar
                </span>
                <span>
                  <kbd className="font-sans">↵</kbd> abrir
                </span>
                <span>
                  <kbd className="font-sans">esc</kbd> fechar
                </span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
