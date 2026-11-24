import { documentosVisiveis } from '@/lib/publico'
import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Film, Link2, ListOrdered, NotebookText, ExternalLink, Star } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { exigirSessao } from '@/lib/auth/session'
import { listarSistemas } from '@/lib/sistemas'
import { BotaoFavorito } from '@/components/kb/BotaoFavorito'

export const metadata: Metadata = {
  title: 'Meus favoritos · Trilara',
  robots: { index: false, follow: false },
}

const FORMATO = {
  PDF: { rotulo: 'PDF', Icone: FileText },
  ARTIGO: { rotulo: 'Página', Icone: NotebookText },
  PASSO_A_PASSO: { rotulo: 'Passo a passo', Icone: ListOrdered },
  LINK: { rotulo: 'Link externo', Icone: Link2 },
  GIF: { rotulo: 'GIF', Icone: Film },
} as const

export default async function FavoritosPage() {
  const sessao = await exigirSessao()
  const [favoritos, sistemas] = await Promise.all([
    prisma.favoritoDocumento.findMany({
      where: { colaboradorId: sessao.id, documento: documentosVisiveis(sessao) },
      orderBy: { criadoEm: 'desc' },
      include: { documento: { select: { id: true, titulo: true, descricao: true, slug: true, sistemaSlug: true, tipo: true, urlExterna: true } } },
    }),
    listarSistemas(),
  ])
  const nomeSistema = new Map(sistemas.map((sistema) => [sistema.slug, sistema.name]))
  const visiveis = favoritos.filter(({ documento }) => nomeSistema.has(documento.sistemaSlug))

  return <div className="portal-page w-full px-4 py-5 sm:px-8 sm:py-10 xl:px-10">
    <header className="mb-7">
      <p className="rotulo text-brand-600 dark:text-brand-400">Sua biblioteca</p>
      <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Meus favoritos</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Documentos salvos na sua conta para consultar quando precisar.</p>
    </header>

    {visiveis.length === 0 ? <div className="rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-800/40">
      <Star size={28} className="mx-auto text-brand-500" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-ink-900 dark:text-ink-50">Nenhum documento salvo ainda</h2>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Use a estrela nos materiais para encontrá-los aqui.</p>
      <Link href="/documentacao" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white">Explorar documentação</Link>
    </div> : <ul className="grid gap-3 lg:grid-cols-2">
      {visiveis.map(({ documento }) => {
        const externo = documento.tipo === 'LINK' && Boolean(documento.urlExterna)
        const href = externo ? documento.urlExterna! : `/documentacao/${documento.sistemaSlug}/${documento.slug}`
        const { Icone, rotulo } = FORMATO[documento.tipo]
        return <li key={documento.id} className="rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800 sm:p-5">
          <div className="flex items-start gap-3">
            <Icone size={21} className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="rotulo text-ink-400">{nomeSistema.get(documento.sistemaSlug) ?? documento.sistemaSlug}</p>
              {externo ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[15px] font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-50 dark:hover:text-brand-400">{documento.titulo}<ExternalLink size={15} aria-hidden="true" /></a>
                : <Link href={href} className="mt-1 block text-[15px] font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-50 dark:hover:text-brand-400">{documento.titulo}</Link>}
              <p className="mt-2"><span className="rounded-md bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-600 dark:bg-ink-700 dark:text-ink-300">{rotulo}</span></p>
              {documento.descricao && <p className="mt-2 line-clamp-2 text-[13px] text-ink-500 dark:text-ink-400">{documento.descricao}</p>}
            </div>
          </div>
          <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-700"><BotaoFavorito documentoId={documento.id} inicial /></div>
        </li>
      })}
    </ul>}
  </div>
}
