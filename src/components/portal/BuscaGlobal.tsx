'use client'

// src/components/portal/BuscaGlobal.tsx
//
// Corpo da página inicial: busca em destaque, indicadores, e duas colunas —
// à esquerda o que mudou há pouco (que vira a lista de resultados quando a
// pessoa digita), à direita atalhos para os sistemas. O suporte fica abaixo dos documentos.
// A busca é a abertura porque é o que a pessoa veio fazer: achar um
// procedimento no meio do turno.

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronRight, Clock3, ExternalLink, FileText, Film, LayoutGrid, LifeBuoy, Link2, ListOrdered, NotebookText, Search } from 'lucide-react'
import { PlacaSistema } from './PlacaSistema'

export type DocumentoBusca = {
  id: string
  titulo: string
  descricao: string | null
  slug: string
  sistemaSlug: string
  sistemaNome: string
  tipo: 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF'
  categoriaNome: string | null
  urlExterna: string | null
  textoPassos: string | null
  // Termos cadastrados pelo TI que não aparecem no título/descrição, pra
  // achar mesmo quando o colaborador pergunta com outras palavras.
  palavrasChave: string | null
  quando: string
}

export type SistemaResumo = { slug: string; nome: string; total: number }

// Exportados para a paleta de busca (PaletaBusca) falar a mesma língua da inicial.
export const ICONE_TIPO = { PDF: FileText, ARTIGO: NotebookText, PASSO_A_PASSO: ListOrdered, LINK: Link2, GIF: Film } as const
export const ROTULO_TIPO = { PDF: 'PDF', ARTIGO: 'Página', PASSO_A_PASSO: 'Passo a passo', LINK: 'Link', GIF: 'GIF' } as const
const RECENTES = 4

export function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function textoDeBusca(documento: DocumentoBusca): string {
  return `${documento.titulo} ${documento.descricao ?? ''} ${documento.sistemaNome} ${documento.categoriaNome ?? ''} ${documento.palavrasChave ?? ''} ${documento.textoPassos ?? ''}`
}

function LinhaDocumento({ doc }: { doc: DocumentoBusca }) {
  const externo = doc.tipo === 'LINK' && doc.urlExterna
  const destino = externo ? doc.urlExterna! : `/documentacao/${doc.sistemaSlug}/${doc.slug}`
  const Icone = ICONE_TIPO[doc.tipo]

  const conteudo = (
    <div className="flex items-start gap-3 px-5 py-5 sm:gap-4 sm:px-7">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Icone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[15px] font-semibold text-ink-900 group-hover:text-brand-600 dark:text-ink-50 dark:group-hover:text-brand-400">
          {doc.titulo}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-500 dark:text-ink-400">
          <span className="rounded-md bg-ink-100 px-2 py-0.5 font-medium text-ink-600 dark:bg-ink-700 dark:text-ink-300">{ROTULO_TIPO[doc.tipo]}</span>
          <span>{doc.sistemaNome}{doc.categoriaNome && ` · ${doc.categoriaNome}`}</span>
          <span className="sm:hidden">· {doc.quando}</span>
        </div>
        {doc.descricao && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{doc.descricao}</p>}
      </div>
      <span className="mt-1 hidden shrink-0 text-[12px] text-ink-500 dark:text-ink-400 sm:block">{doc.quando}</span>
      {externo ? (
        <ExternalLink className="size-4 shrink-0 text-ink-300 group-hover:text-brand-500" aria-hidden />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
      )}
    </div>
  )

  return (
    <li>
      {externo ? (
        <a href={destino} target="_blank" rel="noopener noreferrer" className="group block transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60">
          {conteudo}
        </a>
      ) : (
        <Link href={destino} className="group block transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60">
          {conteudo}
        </Link>
      )}
    </li>
  )
}

export function BuscaGlobal({
  documentos,
  sistemas,
  indicadores,
  conteudoVazio,
}: {
  documentos: DocumentoBusca[]
  sistemas: SistemaResumo[]
  indicadores?: React.ReactNode
  conteudoVazio?: React.ReactNode
}) {
  const [busca, setBusca] = useState('')
  const [atalho, setAtalho] = useState('Ctrl K')
  const termo = busca.trim()

  // Decidido só no cliente: no servidor não dá para saber se é Mac.
  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) setAtalho('⌘K')
  }, [])

  const resultados = useMemo(() => {
    if (!termo) return null
    const t = normalizar(termo)
    return documentos.filter((d) => normalizar(textoDeBusca(d)).includes(t))
  }, [termo, documentos])

  const lista = resultados ?? documentos.slice(0, RECENTES)
  const comDocumento = sistemas.filter((s) => s.total > 0)
  const semDocumento = sistemas.filter((s) => s.total === 0)

  return (
    <div className="space-y-5 sm:space-y-6">
      <section role="search" aria-labelledby="titulo-busca-inicio" className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900 dark:bg-brand-500/5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-busca-inicio" className="text-[18px] font-semibold text-ink-900 dark:text-ink-50">O que você precisa encontrar?</h2>
            <p className="mt-1 text-[13px] text-ink-600 dark:text-ink-400">Busque pelo nome do manual, assunto ou sistema.</p>
          </div>
          <span className="hidden items-center gap-2 text-[12px] text-ink-500 dark:text-ink-400 sm:inline-flex">
            Busca rápida
            <kbd className="rounded-md border border-brand-200 bg-white px-2 py-1 font-sans font-medium dark:border-ink-700 dark:bg-ink-800">{atalho}</kbd>
          </span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand-500 sm:left-5" aria-hidden />
          <input
            id="buscar"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar na documentação"
            aria-label="Buscar na documentação"
            aria-controls="documentos-inicio"
            className="h-12 w-full rounded-xl border border-ink-200 bg-white pl-12 pr-4 text-[16px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50 sm:h-16 sm:pl-14"
          />
        </div>
      </section>

      {!resultados && indicadores}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-6">
          <section id="documentos-inicio" aria-labelledby="titulo-documentos-inicio" className="overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
            <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 px-5 py-5 dark:border-ink-700 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  {resultados ? <Search size={21} aria-hidden="true" /> : <Clock3 size={21} aria-hidden="true" />}
                </span>
                <div>
                  <h2 id="titulo-documentos-inicio" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">
                    {resultados ? 'Resultados da busca' : 'Atualizados recentemente'}
                  </h2>
                  <p role="status" className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">
                    {resultados ? `${resultados.length} ${resultados.length === 1 ? 'documento encontrado' : 'documentos encontrados'}` : 'Últimas atualizações da documentação.'}
                  </p>
                </div>
              </div>
              {resultados ? (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="inline-flex min-h-10 shrink-0 items-center rounded-lg text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Limpar busca
                </button>
              ) : (
                <Link
                  href="/documentacao"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Ver todos
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              )}
            </header>

            {!resultados && documentos.length === 0 && conteudoVazio ? conteudoVazio : lista.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <Search size={26} aria-hidden="true" className="mx-auto mb-4 text-ink-400" />
                <p className="text-[15px] font-medium text-ink-800 dark:text-ink-100">Nada encontrado</p>
                <p className="mt-1 text-[14px] text-ink-500 dark:text-ink-400">
                  Tente o nome do sistema ou outra palavra do título.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-200 dark:divide-ink-700">
                {lista.map((doc) => (
                  <LinhaDocumento key={doc.id} doc={doc} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="suporte-inicio" className="flex flex-wrap items-center gap-4 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <LifeBuoy size={21} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <h2 id="suporte-inicio" className="text-[16px] font-semibold text-ink-900 dark:text-ink-50">Precisa de ajuda?</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">Consulte os canais de atendimento da equipe de TI.</p>
            </div>
            <a href="https://wa.me/5515991903686" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 py-3 text-[14px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:text-brand-400 sm:w-auto">
              Falar com o suporte <ArrowRight size={16} aria-hidden="true" />
            </a>
          </section>
        </div>

        <aside className="min-w-0">
          <section aria-labelledby="sistemas-inicio" className="rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-5 dark:border-ink-700 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                  <LayoutGrid size={21} aria-hidden="true" />
                </span>
                <div>
                  <h2 id="sistemas-inicio" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Sistemas</h2>
                  <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Acesse os manuais por sistema.</p>
                </div>
              </div>
              <Link
                href="/documentacao"
                className="inline-flex min-h-10 items-center rounded-lg text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Ver todos
              </Link>
            </header>
            <ul className="space-y-1 p-3">
              {[...comDocumento, ...semDocumento].map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/documentacao/${s.slug}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-ink-50 dark:hover:bg-ink-700/50"
                  >
                    <PlacaSistema slug={s.slug} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink-800 group-hover:text-brand-600 dark:text-ink-100 dark:group-hover:text-brand-400">{s.nome}</span>
                      <span className={'mt-1 block text-[12px] tabular-nums ' + (s.total > 0 ? 'text-brand-600 dark:text-brand-400' : 'text-ink-500 dark:text-ink-400')}>
                        {s.total > 0 ? `${s.total} ${s.total === 1 ? 'manual disponível' : 'manuais disponíveis'}` : 'Sem manuais publicados'}
                      </span>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-ink-400 group-hover:text-brand-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

        </aside>
      </div>
    </div>
  )
}
