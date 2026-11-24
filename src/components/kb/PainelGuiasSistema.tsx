'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Search, SearchX, Sparkles } from 'lucide-react'
import { BotaoFavorito } from '@/components/kb/BotaoFavorito'
import { RelatarProblema } from '@/components/kb/RelatarProblema'
import { BibliotecaModulos } from '@/components/kb/BibliotecaModulos'
import { documentoCombina, ICONE_TIPO_DOCUMENTO, ROTULO_TIPO_DOCUMENTO, type DocumentoItem } from '@/components/kb/ListaDocumentos'

export function PainelGuiasSistema({ sistema, categorias, documentos, favoritos, lateral, assistenteDisponivel }: {
  sistema: { slug: string; nome: string }
  categorias: { id: string; nome: string }[]
  documentos: DocumentoItem[]
  favoritos: string[]
  lateral: React.ReactNode
  assistenteDisponivel: boolean
}) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim()
  const filtrados = useMemo(() => documentos.filter((documento) => documentoCombina(documento, termo, categorias.find((categoria) => categoria.id === documento.categoriaId)?.nome)), [categorias, documentos, termo])
  const comece = filtrados.filter((documento) => documento.comecePorAqui)
  const total = filtrados.length
  const idsFavoritos = new Set(favoritos)

  function perguntar() {
    if (!assistenteDisponivel) return
    window.dispatchEvent(new CustomEvent('assistente:perguntar', { detail: { sistema: sistema.slug, pergunta: termo } }))
  }

  return <>
    <section role="search" aria-labelledby="busca-guias-titulo" className="mb-7 rounded-2xl border border-brand-200 bg-white p-4 shadow-sm dark:border-brand-500/30 dark:bg-ink-800 sm:p-5">
      <h2 id="busca-guias-titulo" className="sr-only">Buscar nos guias</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1"><Search size={19} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" /><input id="busca-guias" type="search" aria-label="Buscar nos guias" aria-controls="resultados-guias" value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder={`${assistenteDisponivel ? 'Qual é a sua dúvida?' : 'Buscar nos guias'} Ex.: ${(documentos.find((documento) => documento.tipo === 'PASSO_A_PASSO')?.titulo ?? 'como fazer um procedimento').toLowerCase().slice(0, 60)}`} className="min-h-12 w-full rounded-xl border border-ink-200 bg-ink-50 py-3 pl-11 pr-4 text-[14px] text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50" /></label>
        {assistenteDisponivel && <button type="button" onClick={perguntar} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-50 px-5 text-[13px] font-semibold text-brand-700 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-200"><Sparkles size={17} aria-hidden="true" /> Perguntar ao assistente</button>}
      </div>
      {termo && <p role="status" className="mt-3 text-[12px] text-ink-500 dark:text-ink-400">{total} {total === 1 ? 'resultado' : 'resultados'} para “{termo}”</p>}
    </section>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div id="resultados-guias" className="min-w-0 space-y-10">
        {comece.length > 0 && <section aria-labelledby="comece-titulo">
          <p className="rotulo text-brand-600 dark:text-brand-400">Comece por aqui</p><h2 id="comece-titulo" className="mt-1 text-[19px] font-semibold text-ink-900 dark:text-ink-50">Entenda o {sistema.nome}</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{comece.map((documento) => {
            const externo = documento.tipo === 'LINK' && Boolean(documento.urlExterna)
            const Icone = ICONE_TIPO_DOCUMENTO[documento.tipo]
            const href = externo ? documento.urlExterna! : `/documentacao/${sistema.slug}/${documento.slug}`
            const categoriaNome = categorias.find((categoria) => categoria.id === documento.categoriaId)?.nome
            const conteudo = <><div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icone size={20} aria-hidden="true" /></span>{categoriaNome && <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold text-ink-600 dark:bg-ink-700 dark:text-ink-300">{categoriaNome}</span>}</div><h3 className="mt-4 line-clamp-2 text-[15px] font-semibold text-ink-900 group-hover:text-brand-700 dark:text-ink-50 dark:group-hover:text-brand-300">{documento.titulo}</h3>{documento.descricao && <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-500 dark:text-ink-400">{documento.descricao}</p>}<p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-400">{ROTULO_TIPO_DOCUMENTO[documento.tipo]} · {documento.tipo === 'PASSO_A_PASSO' ? `${documento.numeroPassos} ${documento.numeroPassos === 1 ? 'passo' : 'passos'}` : `Atualizado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(documento.atualizadoEm))}`}</p></>
            return <li key={documento.id} className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-800">
              {externo ? <a href={href} target="_blank" rel="noopener noreferrer" className="group block p-5">{conteudo}<ArrowUpRight size={17} className="ml-auto mt-2 text-ink-400" aria-hidden="true" /></a> : <Link href={href} className="group block h-full p-5">{conteudo}<ArrowRight size={17} className="ml-auto mt-2 text-ink-400" aria-hidden="true" /></Link>}
              {externo && <div className="flex items-center justify-between border-t border-ink-100 px-4 py-2 dark:border-ink-700"><BotaoFavorito documentoId={documento.id} inicial={idsFavoritos.has(documento.id)} compacto /><RelatarProblema documentoId={documento.id} compacto /></div>}
            </li>
          })}</ul>
        </section>}

        <BibliotecaModulos sistemaSlug={sistema.slug} categorias={categorias} documentos={filtrados} favoritos={favoritos} buscaAtiva={Boolean(termo)} />

        {total === 0 && termo && <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-800/40"><SearchX size={25} className="mx-auto text-ink-400" aria-hidden="true" /><h2 className="mt-3 text-[16px] font-semibold text-ink-900 dark:text-ink-50">Nada encontrado para “{termo}”</h2><p className="mt-2 text-[13px] text-ink-500 dark:text-ink-400">{assistenteDisponivel ? 'Tente outras palavras ou pergunte ao assistente.' : 'Tente buscar por outras palavras.'}</p><div className="mt-4 flex flex-wrap justify-center gap-3">{assistenteDisponivel && <button type="button" onClick={perguntar} className="min-h-11 rounded-xl bg-brand-600 px-4 text-[13px] font-semibold text-white">Perguntar ao assistente</button>}<button type="button" onClick={() => setBusca('')} className="min-h-11 rounded-xl border border-ink-200 px-4 text-[13px] font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300">Limpar busca</button></div></div>}
      </div>
      <aside className="lg:sticky lg:top-6">{lateral}</aside>
    </div>
  </>
}
