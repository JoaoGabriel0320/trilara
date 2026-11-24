import { documentosVisiveis, podeAcessarSistema } from '@/lib/publico'
// src/app/documentacao/[sistema]/page.tsx

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigirSessao } from '@/lib/auth/session'
import { getSistema } from '@/lib/sistemas'
import { PlacaSistema } from '@/components/portal/PlacaSistema'
import { ListaDocumentos } from '@/components/kb/ListaDocumentos'
import { PainelGuiasSistema } from '@/components/kb/PainelGuiasSistema'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'
import { FormAvaliacaoSistema } from '@/components/kb/FormAvaliacaoSistema'
import { textoPesquisavelDosPassos } from '@/lib/passos-documento'
import { ArrowUpRight, BookOpenText, FileText, Film, FolderOpen, Link2, ListOrdered, NotebookText } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ sistema: string }> }): Promise<Metadata> {
  const { sistema } = await params
  const sessao = await exigirSessao()
  const info = podeAcessarSistema(sessao, sistema) ? await getSistema(sistema) : undefined
  return { title: info ? `${info.name} · Documentação` : 'Documentação', robots: { index: false, follow: false } }
}

export default async function SistemaPage({ params }: { params: Promise<{ sistema: string }> }) {
  const { sistema: slug } = await params
  const sistema = await getSistema(slug)
  if (!sistema) notFound()
  const sessao = await exigirSessao()
  if (!podeAcessarSistema(sessao, slug)) notFound()

  const [registros, categorias, avaliacao, favoritos] = await Promise.all([
    prisma.documento.findMany({
      where: { AND: [documentosVisiveis(sessao), { sistemaSlug: slug }] },
      orderBy: [{ ordem: 'asc' }, { titulo: 'asc' }],
      select: {
        id: true,
        slug: true,
        titulo: true,
        descricao: true,
        palavrasChave: true,
        tipo: true,
        urlExterna: true,
        categoriaId: true,
        criadoEm: true,
        atualizadoEm: true,
        comecePorAqui: true,
        passos: { orderBy: { ordem: 'asc' }, select: { titulo: true, texto: true, caminhoAcesso: true, destaqueTipo: true, destaqueTexto: true } },
      },
    }),
    prisma.categoria.findMany({ where: { sistemaSlug: slug, ativo: true, documentos: { some: documentosVisiveis(sessao) } }, orderBy: [{ ordem: 'asc' }, { nome: 'asc' }], select: { id: true, nome: true } }),
    prisma.avaliacaoSistema.findFirst({ where: { colaboradorId: sessao.id, sistemaSlug: slug }, orderBy: { criadoEm: 'desc' }, select: { criadoEm: true } }),
    prisma.favoritoDocumento.findMany({ where: { colaboradorId: sessao.id, documento: { AND: [documentosVisiveis(sessao), { sistemaSlug: slug }] } }, select: { documentoId: true } }),
  ])

  const documentos = registros.map((documento) => ({
    id: documento.id,
    slug: documento.slug,
    titulo: documento.titulo,
    descricao: documento.descricao,
    palavrasChave: documento.palavrasChave,
    tipo: documento.tipo,
    urlExterna: documento.urlExterna,
    categoriaId: documento.categoriaId,
    criadoEm: documento.criadoEm.toISOString(),
    atualizadoEm: documento.atualizadoEm.toISOString(),
    comecePorAqui: documento.comecePorAqui,
    numeroPassos: documento.passos.length,
    textoBusca: documento.tipo === 'PASSO_A_PASSO' ? textoPesquisavelDosPassos(documento.passos) : null,
  }))
  const modoGuias = documentos.some((documento) => documento.tipo === 'PASSO_A_PASSO' || documento.comecePorAqui)
  const favoritosIds = favoritos.map((favorito) => favorito.documentoId)
  const lateral = <FormAvaliacaoSistema key={avaliacao?.criadoEm.toISOString() ?? 'nova'} sistemaSlug={slug} avaliacao={avaliacao ? { ...avaliacao, criadoEm: avaliacao.criadoEm.toISOString() } : null} agoraInicial={Date.now()} />

  const contagens = {
    PASSO_A_PASSO: documentos.filter((documento) => documento.tipo === 'PASSO_A_PASSO').length,
    ARTIGO: documentos.filter((documento) => documento.tipo === 'ARTIGO').length,
    PDF: documentos.filter((documento) => documento.tipo === 'PDF').length,
    GIF: documentos.filter((documento) => documento.tipo === 'GIF').length,
    LINK: documentos.filter((documento) => documento.tipo === 'LINK').length,
  }

  return <div className="w-full max-w-[1380px] portal-page px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
    <nav aria-label="Caminho de navegação" className="rotulo mb-6 flex items-center gap-2 text-ink-400"><Link href="/documentacao" className="hover:text-brand-600 dark:hover:text-brand-400">Documentação</Link><span aria-hidden="true">/</span><span className="text-ink-700 dark:text-ink-300">{sistema.name}</span></nav>

    <header className="mb-8 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-800">
      <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <PlacaSistema slug={sistema.slug} size="lg" />
          <div className="min-w-0"><p className="rotulo mb-2 text-brand-600 dark:text-brand-400">Central de documentação</p><h1 className="text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">{sistema.name}</h1><p className="mt-2 max-w-[720px] text-[14px] leading-relaxed text-ink-500 dark:text-ink-400">{sistema.description}</p></div>
        </div>
        {sistema.url && <a href={sistema.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-brand-500 px-5 text-[13px] font-semibold text-white transition hover:bg-brand-600 lg:self-center">Abrir sistema <ArrowUpRight size={17} aria-hidden="true" /></a>}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-200 bg-ink-50 px-4 py-3 text-[13px] text-ink-600 dark:border-ink-700 dark:bg-ink-900/40 dark:text-ink-300 sm:px-8">
        {modoGuias ? <>
          {contagens.PASSO_A_PASSO > 0 && <span className="inline-flex items-center gap-2"><ListOrdered size={16} className="text-brand-500" aria-hidden="true" />{contagens.PASSO_A_PASSO} {contagens.PASSO_A_PASSO === 1 ? 'guia passo a passo' : 'guias passo a passo'}</span>}
          {contagens.ARTIGO > 0 && <span className="inline-flex items-center gap-2"><NotebookText size={16} className="text-brand-500" aria-hidden="true" />{contagens.ARTIGO} {contagens.ARTIGO === 1 ? 'página' : 'páginas'}</span>}
          {contagens.PDF > 0 && <span className="inline-flex items-center gap-2"><FileText size={16} className="text-brand-500" aria-hidden="true" />{contagens.PDF} {contagens.PDF === 1 ? 'PDF' : 'PDFs'}</span>}
          {contagens.GIF > 0 && <span className="inline-flex items-center gap-2"><Film size={16} className="text-brand-500" aria-hidden="true" />{contagens.GIF} {contagens.GIF === 1 ? 'GIF' : 'GIFs'}</span>}
          {contagens.LINK > 0 && <span className="inline-flex items-center gap-2"><Link2 size={16} className="text-brand-500" aria-hidden="true" />{contagens.LINK} {contagens.LINK === 1 ? 'link externo' : 'links externos'}</span>}
          {categorias.length > 0 && <span className="inline-flex items-center gap-2"><FolderOpen size={16} className="text-brand-500" aria-hidden="true" />{categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'}</span>}
        </> : <><span className="inline-flex items-center gap-2"><BookOpenText size={16} className="text-brand-500" aria-hidden="true" />{documentos.length} {documentos.length === 1 ? 'material disponível' : 'materiais disponíveis'}</span><span className="inline-flex items-center gap-2"><FolderOpen size={16} className="text-brand-500" aria-hidden="true" />{categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'}</span></>}
      </div>
    </header>

    {modoGuias ? <PainelGuiasSistema sistema={{ slug, nome: sistema.name }} categorias={categorias} documentos={documentos} favoritos={favoritosIds} lateral={lateral} assistenteDisponivel={ASSISTENTE_ATIVO && sessao.tipoAcesso === 'INTERNO'} /> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div className="min-w-0">{documentos.length === 0 ? <p className="rounded-2xl border border-dashed border-ink-200 px-6 py-10 text-center text-[14px] text-ink-500 dark:border-ink-800 dark:text-ink-400">Nenhum documento publicado para este sistema ainda.</p> : <ListaDocumentos sistemaSlug={slug} categorias={categorias} favoritos={favoritosIds} documentos={documentos} />}</div>
      <aside className="lg:sticky lg:top-6">{lateral}</aside>
    </div>}
  </div>
}
