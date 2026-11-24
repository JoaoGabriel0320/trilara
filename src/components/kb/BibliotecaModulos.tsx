'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, FolderOpen, ListOrdered } from 'lucide-react'
import { BotaoFavorito } from '@/components/kb/BotaoFavorito'
import { RelatarProblema } from '@/components/kb/RelatarProblema'
import { ICONE_TIPO_DOCUMENTO, ROTULO_TIPO_DOCUMENTO, type DocumentoItem } from '@/components/kb/ListaDocumentos'

type Categoria = { id: string; nome: string }

function nomeDoModulo(nomeCategoria: string) {
  return nomeCategoria.split(' · ')[0].trim() || 'Geral'
}

export function BibliotecaModulos({ sistemaSlug, categorias, documentos, favoritos, buscaAtiva }: {
  sistemaSlug: string
  categorias: Categoria[]
  documentos: DocumentoItem[]
  favoritos: string[]
  buscaAtiva: boolean
}) {
  const [moduloSelecionado, setModuloSelecionado] = useState<string | null>(null)
  const modulos = useMemo(() => {
    const nomesCategorias = new Map(categorias.map((categoria) => [categoria.id, categoria.nome]))
    const grupos = new Map<string, DocumentoItem[]>()
    for (const categoria of categorias) grupos.set(nomeDoModulo(categoria.nome), [])
    for (const documento of documentos) {
      const modulo = nomeDoModulo(nomesCategorias.get(documento.categoriaId ?? '') ?? 'Geral')
      if (!grupos.has(modulo)) grupos.set(modulo, [])
      grupos.get(modulo)!.push(documento)
    }
    return [...grupos].filter(([, itens]) => itens.length > 0).map(([nome, itens]) => ({ nome, itens }))
  }, [categorias, documentos])
  const nomesCategorias = useMemo(() => new Map(categorias.map((categoria) => [categoria.id, categoria.nome])), [categorias])
  const favoritosIds = useMemo(() => new Set(favoritos), [favoritos])
  const moduloVisivel = modulos.find((modulo) => modulo.nome === moduloSelecionado)
  const gruposVisiveis = buscaAtiva ? modulos : moduloVisivel ? [moduloVisivel] : []

  if (!documentos.length) return null

  return <section aria-labelledby="biblioteca-modulos-titulo">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="rotulo text-brand-600 dark:text-brand-400">Biblioteca</p><h2 id="biblioteca-modulos-titulo" className="mt-1 text-[19px] font-semibold text-ink-900 dark:text-ink-50">Explore por módulo</h2><p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Abra um módulo para ver seus materiais e guias passo a passo.</p></div>
      <span className="text-[12px] text-ink-500 dark:text-ink-400">{documentos.length} {documentos.length === 1 ? 'material' : 'materiais'}</span>
    </div>

    {!buscaAtiva && <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Módulos da biblioteca">
      {modulos.map((modulo) => {
        const selecionado = !buscaAtiva && moduloSelecionado === modulo.nome
        const guias = modulo.itens.filter((item) => item.tipo === 'PASSO_A_PASSO').length
        return <button key={modulo.nome} type="button" onClick={() => setModuloSelecionado((atual) => atual === modulo.nome ? null : modulo.nome)} aria-expanded={selecionado} aria-controls="conteudo-modulos" className={`group flex min-h-28 flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${selecionado ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10' : 'border-ink-200 bg-white hover:border-brand-300 hover:shadow-md dark:border-ink-800 dark:bg-ink-800 dark:hover:border-brand-500/50'}`}>
          <span className="flex w-full items-start justify-between gap-2"><span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><FolderOpen size={19} aria-hidden="true" /></span><ArrowRight size={17} aria-hidden="true" className={`mt-1 text-ink-400 transition-transform ${selecionado ? 'rotate-90 text-brand-600' : 'group-hover:translate-x-0.5'}`} /></span>
          <span className="mt-3 block text-[15px] font-semibold text-ink-900 dark:text-ink-50">{modulo.nome}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500 dark:text-ink-400"><span>{modulo.itens.length} {modulo.itens.length === 1 ? 'material' : 'materiais'}</span>{guias > 0 && <span className="inline-flex items-center gap-1"><ListOrdered size={13} aria-hidden="true" />{guias} {guias === 1 ? 'guia' : 'guias'}</span>}</span>
        </button>
      })}
    </div>}

    <div id="conteudo-modulos">
      <AnimatePresence initial={false}>
      {gruposVisiveis.length > 0 && <motion.div key={buscaAtiva ? 'resultados-busca' : moduloSelecionado} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.32, ease: 'easeInOut' }} className="overflow-hidden">
      <div className="space-y-8 pt-6">
      {gruposVisiveis.map((modulo) => <section key={modulo.nome} aria-label={`Materiais de ${modulo.nome}`}>
        <div className="mb-3 flex items-center gap-3"><h3 className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">{modulo.nome}</h3><span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" /></div>
        <ul className="space-y-2">{modulo.itens.map((documento) => {
          const externo = documento.tipo === 'LINK' && Boolean(documento.urlExterna)
          const href = externo ? documento.urlExterna! : `/documentacao/${sistemaSlug}/${documento.slug}`
          const Icone = ICONE_TIPO_DOCUMENTO[documento.tipo]
          const nomeCategoria = nomesCategorias.get(documento.categoriaId ?? '')
          const processo = nomeCategoria?.startsWith(`${modulo.nome} · `) ? nomeCategoria.slice(modulo.nome.length + 3) : null
          const conteudo = <span className="group flex min-w-0 flex-1 items-start gap-3 px-4 py-4 sm:px-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icone size={19} aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold text-ink-900 group-hover:text-brand-700 dark:text-ink-50 dark:group-hover:text-brand-300">{documento.titulo}</span>{documento.descricao && <span className="mt-1 block line-clamp-2 text-[12px] text-ink-500 dark:text-ink-400">{documento.descricao}</span>}<span className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-500 dark:text-ink-400"><span className="rounded-md bg-ink-100 px-2 py-0.5 dark:bg-ink-700">{ROTULO_TIPO_DOCUMENTO[documento.tipo]}</span>{processo && <span>{processo}</span>}{documento.tipo === 'PASSO_A_PASSO' && <span>{documento.numeroPassos} {documento.numeroPassos === 1 ? 'passo' : 'passos'}</span>}{documento.comecePorAqui && <span className="text-brand-600 dark:text-brand-300">Comece por aqui</span>}</span></span>{externo ? <ArrowUpRight size={17} aria-hidden="true" className="mt-2 shrink-0 text-ink-400" /> : <ArrowRight size={17} aria-hidden="true" className="mt-2 shrink-0 text-ink-400" />}</span>
          return <li key={documento.id} className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-800/60">
            {externo ? <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:bg-ink-50 dark:hover:bg-ink-700/40">{conteudo}</a> : <Link href={href} className="block hover:bg-ink-50 dark:hover:bg-ink-700/40">{conteudo}</Link>}
            <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2 dark:border-ink-700"><BotaoFavorito documentoId={documento.id} inicial={favoritosIds.has(documento.id)} compacto />{externo && <RelatarProblema documentoId={documento.id} compacto />}</div>
          </li>
        })}</ul>
      </section>)}
      </div>
      </motion.div>}
      </AnimatePresence>
    </div>
  </section>
}
