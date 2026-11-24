'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, BookOpenText, FileText, Film, Link2, ListOrdered, Search, SearchX, X } from 'lucide-react'
import { RelatarProblema } from '@/components/kb/RelatarProblema'
import { BotaoFavorito } from '@/components/kb/BotaoFavorito'

export type TipoDocumentoItem = 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF'

export type DocumentoItem = {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  palavrasChave: string | null
  tipo: TipoDocumentoItem
  urlExterna: string | null
  categoriaId: string | null
  criadoEm: string
  atualizadoEm: string
  textoBusca?: string | null
  numeroPassos?: number
  comecePorAqui?: boolean
}

export const ROTULO_TIPO_DOCUMENTO: Record<TipoDocumentoItem, string> = { PDF: 'PDF', ARTIGO: 'Página', PASSO_A_PASSO: 'Passo a passo', LINK: 'Link externo', GIF: 'GIF' }
export const ICONE_TIPO_DOCUMENTO = { PDF: FileText, ARTIGO: BookOpenText, PASSO_A_PASSO: ListOrdered, LINK: Link2, GIF: Film }
const COR_TIPO: Record<TipoDocumentoItem, string> = {
  PDF: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  ARTIGO: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  PASSO_A_PASSO: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  LINK: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
  GIF: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
}
const DIAS_COMO_NOVO = 7

function ehNovo(criadoEm: string) {
  const idadeMs = Date.now() - new Date(criadoEm).getTime()
  return idadeMs >= 0 && idadeMs < DIAS_COMO_NOVO * 24 * 60 * 60 * 1000
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function documentoCombina(doc: DocumentoItem, termo: string, categoriaNome = '') {
  const busca = normalizar(termo.trim())
  return !busca || normalizar(`${doc.titulo} ${doc.descricao ?? ''} ${doc.palavrasChave ?? ''} ${doc.textoBusca ?? ''} ${categoriaNome}`).includes(busca)
}

function dataCurta(iso: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
}

export function ListaDocumentos({ sistemaSlug, categorias, documentos, favoritos, variante = 'biblioteca' }: {
  sistemaSlug: string
  categorias: { id: string; nome: string }[]
  documentos: DocumentoItem[]
  favoritos: string[]
  variante?: 'biblioteca' | 'outros'
}) {
  const [busca, setBusca] = useState('')
  const idsFavoritos = new Set(favoritos)
  const filtrados = useMemo(() => variante === 'outros' ? documentos : documentos.filter((doc) => documentoCombina(doc, busca, categorias.find((categoria) => categoria.id === doc.categoriaId)?.nome)), [busca, categorias, documentos, variante])
  const grupos = useMemo(() => {
    const lista = categorias.map((categoria) => ({ id: categoria.id, nome: categoria.nome, itens: filtrados.filter((doc) => doc.categoriaId === categoria.id) }))
    const semCategoria = filtrados.filter((doc) => !doc.categoriaId || !categorias.some((categoria) => categoria.id === doc.categoriaId))
    if (semCategoria.length) lista.push({ id: 'geral', nome: 'Geral', itens: semCategoria })
    return lista.filter((grupo) => grupo.itens.length > 0)
  }, [categorias, filtrados])

  if (variante === 'outros' && !documentos.length) return null

  return <div>
    {variante === 'biblioteca' ? <section aria-labelledby="materiais-titulo" className="mb-8 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-800 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="rotulo text-brand-600 dark:text-brand-400">Biblioteca</p><h2 id="materiais-titulo" className="mt-1 text-[18px] font-semibold text-ink-900 dark:text-ink-50">Materiais disponíveis</h2></div>
        <span className="text-[13px] text-ink-500 dark:text-ink-400">{busca.trim() ? `${filtrados.length} de ${documentos.length}` : documentos.length} {documentos.length === 1 ? 'material' : 'materiais'}</span>
      </div>
      <label className="relative mt-5 block max-w-[560px]">
        <span className="sr-only">Buscar nesta documentação</span><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input type="text" role="searchbox" inputMode="search" enterKeyHint="search" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar por título, assunto ou palavra-chave…" className="min-h-12 w-full rounded-xl border border-ink-200 bg-ink-50 py-3 pl-11 pr-11 text-[14px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50" />
        {busca && <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-700 dark:hover:text-white"><X size={17} aria-hidden="true" /></button>}
      </label>
    </section> : <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="rotulo text-brand-600 dark:text-brand-400">Biblioteca</p><h2 id="outros-materiais-titulo" className="mt-1 text-[18px] font-semibold text-ink-900 dark:text-ink-50">Outros materiais</h2></div><span className="text-[12px] text-ink-500 dark:text-ink-400">{documentos.length} {documentos.length === 1 ? 'material' : 'materiais'}</span></div>}

    {grupos.length === 0 ? <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-800/40">
      <SearchX size={24} aria-hidden="true" className="mx-auto text-ink-400" /><h3 className="mt-3 text-[15px] font-semibold text-ink-900 dark:text-ink-50">Nenhum material encontrado</h3><p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Tente outro termo ou limpe a busca para ver todos os materiais.</p><button type="button" onClick={() => setBusca('')} className="mt-4 text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-400">Limpar busca</button>
    </div> : <div className="space-y-8">
      {grupos.map((grupo) => <section key={grupo.id} aria-labelledby={`categoria-${grupo.id}`}>
        <div className="mb-3 flex flex-wrap items-center gap-3"><h3 id={`categoria-${grupo.id}`} className="text-[16px] font-semibold text-ink-900 dark:text-ink-50">{grupo.nome}</h3><span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400">{grupo.itens.length} {grupo.itens.length === 1 ? 'material' : 'materiais'}</span><span className="h-px min-w-8 flex-1 bg-ink-200 dark:bg-ink-800" /></div>
        <ul className="space-y-3">{grupo.itens.map((doc) => {
          const externo = doc.tipo === 'LINK' && Boolean(doc.urlExterna)
          const Icone = ICONE_TIPO_DOCUMENTO[doc.tipo]
          const conteudo = <div className="flex items-start gap-4 p-4 sm:p-5"><span aria-hidden="true" className={`grid size-11 shrink-0 place-items-center rounded-xl ${COR_TIPO[doc.tipo]}`}><Icone size={21} strokeWidth={1.8} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-[14.5px] font-semibold text-ink-900 transition group-hover:text-brand-600 dark:text-ink-50 dark:group-hover:text-brand-400">{doc.titulo}</h4>{ehNovo(doc.criadoEm) && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">Novo</span>}</div>{doc.descricao && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">{doc.descricao}</p>}<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-ink-400 dark:text-ink-500"><span className="rounded-md bg-ink-100 px-2 py-0.5 text-ink-600 dark:bg-ink-700 dark:text-ink-300">{ROTULO_TIPO_DOCUMENTO[doc.tipo]}</span><time dateTime={doc.atualizadoEm}>Atualizado em {dataCurta(doc.atualizadoEm)}</time></div></div><span aria-hidden="true" className="mt-2 shrink-0 text-ink-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500">{externo ? <ArrowUpRight size={19} /> : <ArrowRight size={19} />}</span></div>
          return <li key={doc.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm transition hover:border-brand-300 hover:shadow-md dark:border-ink-800 dark:bg-ink-800/60 dark:hover:border-brand-600">
            {externo ? <a href={doc.urlExterna!} target="_blank" rel="noopener noreferrer" className="group block focus-visible:outline-brand-500">{conteudo}</a> : <Link href={`/documentacao/${sistemaSlug}/${doc.slug}`} className="group block focus-visible:outline-brand-500">{conteudo}</Link>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 px-4 py-2 dark:border-ink-700 sm:px-5"><BotaoFavorito documentoId={doc.id} inicial={idsFavoritos.has(doc.id)} compacto />{externo && <RelatarProblema documentoId={doc.id} compacto />}</div>
          </li>
        })}</ul>
      </section>)}
    </div>}
  </div>
}
