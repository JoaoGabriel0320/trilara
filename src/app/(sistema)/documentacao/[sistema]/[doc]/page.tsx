import { podeLerDocumento, podeAcessarSistema } from '@/lib/publico'
// src/app/documentacao/[sistema]/[doc]/page.tsx

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cache } from 'react'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, BookOpen, CalendarDays, ChevronDown, Clock, Download, FileText, Film, FolderOpen, Images, ListOrdered } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getSessao } from '@/lib/auth/session'
import { getSistema } from '@/lib/sistemas'
import { markdownParaHtml } from '@/lib/markdown'
import { VisualizadorPdf } from '@/components/kb/VisualizadorPdf'
import { GaleriaImagensDocumento } from '@/components/kb/GaleriaImagensDocumento'
import { RelatarProblema } from '@/components/kb/RelatarProblema'
import { BotaoFavorito } from '@/components/kb/BotaoFavorito'
import { PlacaSistema } from '@/components/portal/PlacaSistema'
import { GuiaPassoAPasso } from '@/components/kb/GuiaPassoAPasso'
import { BotaoImprimirGuia } from '@/components/kb/BotaoImprimirGuia'
import { estimarMinutosLeitura, ROTULO_FORMATO } from '@/lib/passos-documento'

type Params = Promise<{ sistema: string; doc: string }>

function resumirDescricao(descricao: string) {
  const texto = descricao.trim()
  if (texto.length <= 320) return { resumo: texto, complemento: '' }

  const fimDaPrimeiraFrase = texto.search(/[.!?](?=\s|$)/)
  const corte = fimDaPrimeiraFrase >= 70 && fimDaPrimeiraFrase < 320
    ? fimDaPrimeiraFrase + 1
    : Math.max(texto.lastIndexOf(' ', 220), 1)

  return {
    resumo: texto.slice(0, corte).trim(),
    complemento: texto.slice(corte).trim(),
  }
}

const buscar = cache(async (sistemaSlug: string, slug: string) => {
  const sessao = await getSessao()
  if (!sessao || !podeAcessarSistema(sessao, sistemaSlug)) return null
  const documento = await prisma.documento.findUnique({
    where: { sistemaSlug_slug: { sistemaSlug, slug } },
    include: {
      categoria: { select: { nome: true } },
      imagens: { orderBy: [{ ordem: 'asc' }, { criadaEm: 'asc' }] },
      passos: {
        orderBy: { ordem: 'asc' },
        select: {
          titulo: true,
          texto: true,
          caminhoAcesso: true,
          destaqueTipo: true,
          destaqueTexto: true,
          imagem: { select: { id: true } },
          imagemAcesso: { select: { id: true } },
        },
      },
    },
  })
  return documento && podeLerDocumento(sessao, documento) ? documento : null
})

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { sistema, doc } = await params
  const documento = await buscar(sistema, doc)
  return {
    title: documento ? `${documento.titulo} · Documentação` : 'Documentação',
    robots: { index: false, follow: false },
  }
}

export default async function DocumentoPage({ params }: { params: Params }) {
  const { sistema: slugSistema, doc: slugDoc } = await params

  const sistema = await getSistema(slugSistema)
  if (!sistema) notFound()

  const documento = await buscar(slugSistema, slugDoc)
  if (!documento || !documento.ativo) notFound()

  if (documento.tipo === 'LINK' && documento.urlExterna) {
    redirect(documento.urlExterna)
  }

  // Contador simples de leitura — só de quem lê de verdade. EDITOR/ADMIN
  // abrindo a própria publicação pra conferir não conta, senão o número mede
  // "quantas vezes o TI checou" em vez de "quantos colaboradores leram".
  // Não bloqueia a renderização nem quebra a página se falhar — é métrica,
  // não conteúdo.
  const sessao = await getSessao()
  const favorito = sessao ? await prisma.favoritoDocumento.findUnique({
    where: { colaboradorId_documentoId: { colaboradorId: sessao.id, documentoId: documento.id } },
    select: { documentoId: true },
  }) : null
  if (sessao?.papel === 'COLABORADOR') {
    prisma.documento
      .update({ where: { id: documento.id }, data: { visualizacoes: { increment: 1 } } })
      .catch(() => {})
  }

  const atualizado = documento.atualizadoEm.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const descricao = documento.descricao ? resumirDescricao(documento.descricao) : null
  const temPdf = documento.tipo === 'PDF' && !!documento.arquivoKey
  const temArtigo = documento.tipo === 'ARTIGO' && (!!documento.conteudo?.trim() || documento.imagens.length > 0)
  const temGif = documento.tipo === 'GIF' && !!documento.arquivoKey
  const temGuia = documento.tipo === 'PASSO_A_PASSO' && documento.passos.length > 0
  const rotuloFormato = ROTULO_FORMATO[documento.tipo]
  const minutosLeitura = temGuia ? estimarMinutosLeitura(documento.passos, documento.passos.reduce((total, passo) => total + Number(Boolean(passo.imagem)) + Number(Boolean(passo.imagemAcesso)), 0)) : 0

  return (
    <div className={`portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10 ${temGuia ? 'guia-impressao' : ''}`}>
      {temGuia && <style>{'@page { size: A4; margin: 0; }'}</style>}
      {temGuia && <div className="cabecalho-guia-impressao hidden items-center justify-between gap-5 border-b border-ink-200 pb-4 print:!flex">
        <Image src="/brand/trilara-logo-light.svg" alt="Trilara" width={132} height={36} priority className="h-auto w-[132px]" />
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider">Trilara</p>
          <p className="mt-1 text-[12px]">Documentação · Guia passo a passo</p>
        </div>
      </div>}
      <nav aria-label="Navegação estrutural" className={`rotulo mb-3 flex flex-wrap items-center gap-2 text-ink-400 sm:mb-6 ${temGuia ? 'print:!hidden' : ''}`}>
        <Link href="/documentacao" className="hover:text-brand-600 dark:hover:text-brand-400">
          Documentação
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/documentacao/${sistema.slug}`}
          className="hover:text-brand-600 dark:hover:text-brand-400"
        >
          {sistema.name}
        </Link>
        <span aria-hidden="true" className="hidden sm:inline">/</span>
        <span aria-current="page" className="hidden text-ink-700 dark:text-ink-300 sm:inline">{documento.titulo}</span>
      </nav>

      <header className="mb-6 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 w-full sm:w-auto sm:flex-1">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {rotuloFormato}
              </span>
              {documento.categoria && (
                <span className="rounded-full bg-ink-100 px-3 py-1 text-[12px] font-medium text-ink-600 dark:bg-ink-700 dark:text-ink-300">
                  {documento.categoria.nome}
                </span>
              )}
            </div>
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">
              {documento.titulo}
            </h1>
            {temGuia && descricao && <div className="mt-3 max-w-[760px] text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">
              <p>{descricao.resumo}</p>
              {descricao.complemento && <details className="mt-2"><summary className="cursor-pointer text-[12px] font-semibold text-brand-600 dark:text-brand-400">Ler descrição completa</summary><p className="mt-2 whitespace-pre-line">{descricao.complemento}</p></details>}
            </div>}
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-500 dark:text-ink-400">
              <span className="inline-flex items-center gap-2"><PlacaSistema slug={sistema.slug} size="sm" />{sistema.name}</span>
              {temGuia && <span className="inline-flex items-center gap-2"><ListOrdered size={16} aria-hidden="true" />{documento.passos.length} {documento.passos.length === 1 ? 'passo' : 'passos'}</span>}
              {temGuia && <span className="inline-flex items-center gap-2"><Clock size={16} aria-hidden="true" />cerca de {minutosLeitura} min</span>}
              <span className="inline-flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" />Atualizado em {atualizado}</span>
            </div>
          </div>
          <div className={`flex w-full flex-wrap gap-2 sm:w-auto ${temGuia ? 'print:!hidden' : ''}`}>
            <BotaoFavorito documentoId={documento.id} inicial={Boolean(favorito)} />
            {temGuia && <BotaoImprimirGuia />}
            {temGuia && sistema.url && <a href={sistema.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-700">Abrir {sistema.name} <ArrowUpRight size={17} aria-hidden="true" /></a>}
            <Link href={`/documentacao/${sistema.slug}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 py-3 text-[14px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300 dark:hover:text-brand-400">
              <ArrowLeft size={17} aria-hidden="true" /> Outros manuais
            </Link>
          </div>
        </div>
      </header>

      {temGuia ? (
        <GuiaPassoAPasso
          documentoId={documento.id}
          passos={documento.passos.map((passo, indice) => ({
            numero: indice + 1,
            titulo: passo.titulo,
            html: passo.texto?.trim() ? markdownParaHtml(passo.texto) : null,
            caminhoAcesso: passo.caminhoAcesso,
            print: passo.imagem ? { url: `/api/documentos/${documento.id}/imagens/${passo.imagem.id}` } : null,
            printAcesso: passo.imagemAcesso ? { url: `/api/documentos/${documento.id}/imagens/${passo.imagemAcesso.id}` } : null,
            destaque: passo.destaqueTipo && passo.destaqueTexto ? { tipo: passo.destaqueTipo, texto: passo.destaqueTexto } : null,
          }))}
        />
      ) : (
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,1fr)]">
        <div className="min-w-0">
          {temPdf ? (
            <section aria-labelledby="arquivo-documento">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><FileText size={21} aria-hidden="true" /></span>
                <div>
                  <h2 id="arquivo-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Arquivo do documento</h2>
                  <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Abra o PDF para consultar o manual completo.</p>
                </div>
              </div>
              <VisualizadorPdf
                id={documento.id}
                nomeArquivo={documento.arquivoNome ?? `${documento.slug}.pdf`}
                tamanhoBytes={documento.arquivoBytes}
              />
            </section>
          ) : temGif ? (
            <section aria-labelledby="gif-documento">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Film size={21} aria-hidden="true" /></span>
                <div>
                  <h2 id="gif-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Animação do documento</h2>
                  <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Veja a animação para consultar o passo a passo.</p>
                </div>
              </div>
              <div className="min-w-0 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-6">
                {/* <img> simples: o otimizador do Next não preserva a animação do GIF. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/documentos/${documento.id}/arquivo`}
                  alt={documento.titulo}
                  className="mx-auto h-auto max-h-[75vh] w-auto max-w-full rounded-lg"
                />
                <a
                  href={`/api/documentos/${documento.id}/arquivo?download=1`}
                  className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 px-5 py-3 text-[14px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-ink-700 dark:text-ink-300 dark:hover:text-brand-400 dark:focus-visible:ring-offset-ink-800"
                >
                  <Download size={17} aria-hidden="true" /> Baixar GIF
                </a>
              </div>
            </section>
          ) : temArtigo ? (
            <section aria-labelledby="conteudo-documento">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><BookOpen size={21} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <h2 id="conteudo-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Conteúdo do documento</h2>
                  <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">{documento.imagens.length > 0 ? 'Consulte as instruções e os prints do módulo.' : 'Leia as instruções para usar o módulo.'}</p>
                </div>
                <span className="ml-auto inline-flex shrink-0 items-center gap-2 text-[12px] font-medium text-ink-600 dark:text-ink-300">
                  <PlacaSistema slug={sistema.slug} size="sm" />
                  {sistema.name}
                </span>
              </div>
              <div className="min-w-0 rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800 sm:p-7">
                {documento.conteudo?.trim() && (
                  <article
                    className="conteudo-artigo min-w-0 max-w-[760px] [overflow-wrap:anywhere] text-[15px] leading-relaxed text-ink-700 dark:text-ink-300"
                    dangerouslySetInnerHTML={{ __html: markdownParaHtml(documento.conteudo) }}
                  />
                )}
                {documento.imagens.length > 0 && (
                  <div className={documento.conteudo?.trim() ? 'mt-8 border-t border-ink-200 pt-7 dark:border-ink-700' : ''}>
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Images size={20} aria-hidden="true" /></span>
                      <div>
                        <h3 className="text-[15px] font-semibold text-ink-900 dark:text-ink-50">Prints do módulo</h3>
                        <p className="text-[12px] text-ink-500 dark:text-ink-400">Clique em uma imagem para ampliar.</p>
                      </div>
                      <span className="ml-auto rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-medium text-ink-500 dark:bg-ink-700 dark:text-ink-300">{documento.imagens.length} {documento.imagens.length === 1 ? 'imagem' : 'imagens'}</span>
                    </div>
                    <GaleriaImagensDocumento imagens={documento.imagens.map((imagem) => ({
                      id: imagem.id,
                      arquivoNome: imagem.arquivoNome,
                      url: `/api/documentos/${documento.id}/imagens/${imagem.id}`,
                    }))} />
                  </div>
                )}
              </div>
            </section>
          ) : (
            <p className="rounded-2xl border border-dashed border-ink-200 px-6 py-10 text-[14px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
              Este documento ainda não tem conteúdo publicado.
            </p>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          <RelatarProblema documentoId={documento.id} />
          {descricao && (
            <section aria-labelledby="sobre-documento" className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><BookOpen size={21} aria-hidden="true" /></span>
                <h2 id="sobre-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Sobre este documento</h2>
              </div>
              <p className="mt-5 [overflow-wrap:anywhere] text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">{descricao.resumo}</p>
              {descricao.complemento && (
                <details className="group mt-4 border-t border-ink-200 pt-4 dark:border-ink-700">
                  <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold text-brand-600 marker:hidden hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300">
                    Ler descrição completa <ChevronDown size={17} aria-hidden="true" className="shrink-0 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 whitespace-pre-line [overflow-wrap:anywhere] text-[14px] leading-relaxed text-ink-600 dark:text-ink-300">{descricao.complemento}</p>
                </details>
              )}
            </section>
          )}

          <section aria-labelledby="detalhes-documento" className="rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><FolderOpen size={21} aria-hidden="true" /></span>
              <h2 id="detalhes-documento" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Informações</h2>
            </div>
            <dl className="mt-4 divide-y divide-ink-200 dark:divide-ink-700">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3"><dt className="text-[13px] text-ink-500 dark:text-ink-400">Sistema</dt><dd className="text-[13px] font-medium text-ink-800 dark:text-ink-200">{sistema.name}</dd></div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3"><dt className="text-[13px] text-ink-500 dark:text-ink-400">Seção</dt><dd className="text-[13px] font-medium text-ink-800 dark:text-ink-200">{documento.categoria?.nome ?? 'Geral'}</dd></div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3"><dt className="text-[13px] text-ink-500 dark:text-ink-400">Formato</dt><dd className="text-[13px] font-medium text-ink-800 dark:text-ink-200">{rotuloFormato}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
      )}
    </div>
  )
}
