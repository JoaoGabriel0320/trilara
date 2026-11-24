import type { Metadata } from 'next'
import Link from 'next/link'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdmin } from '@/lib/auth/session'
import { listarSistemas } from '@/lib/sistemas'
import { FiltrosAvaliacoes } from '@/components/kb/FiltrosAvaliacoes'
import { RespostaAvaliacao } from '@/components/kb/RespostaAvaliacao'

export const metadata: Metadata = {
  title: 'Avaliações · Trilara',
  robots: { index: false, follow: false },
}

const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo',
})
const RESPOSTAS_POR_PAGINA = 5

function dataIsoValida(valor: string | undefined): valor is string {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const data = new Date(`${valor}T12:00:00Z`)
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor
}

export default async function AvaliacoesPage({ searchParams }: {
  searchParams: Promise<{ sistema?: string; filial?: string; de?: string; ate?: string; pagina?: string }>
}) {
  await exigirAdmin()
  const sistemasCatalogo = await listarSistemas()
  const parametros = await searchParams
  const sistema = parametros.sistema && sistemasCatalogo.find((item) => item.slug === parametros.sistema) ? parametros.sistema : ''
  const [filiaisCadastradas, filiaisNasAvaliacoes] = await Promise.all([
    prisma.filial.findMany({ select: { nome: true }, orderBy: { nome: 'asc' } }),
    prisma.avaliacaoSistema.findMany({ distinct: ['filialNome'], select: { filialNome: true } }),
  ])
  const nomesFiliais = [...new Set([
    ...filiaisCadastradas.map((item) => item.nome),
    ...filiaisNasAvaliacoes.map((item) => item.filialNome).filter((nome): nome is string => Boolean(nome)),
  ])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const semFilial = filiaisNasAvaliacoes.some((item) => item.filialNome === null)
  const filial = parametros.filial === '__sem_filial__' && semFilial
    ? '__sem_filial__'
    : typeof parametros.filial === 'string' && nomesFiliais.includes(parametros.filial) ? parametros.filial : ''
  const intervaloValido = dataIsoValida(parametros.de) && dataIsoValida(parametros.ate) && parametros.de <= parametros.ate
  const de = intervaloValido ? parametros.de! : ''
  const ate = intervaloValido ? parametros.ate! : ''

  const where: Prisma.AvaliacaoSistemaWhereInput = {
    ...(sistema ? { sistemaSlug: sistema } : {}),
    ...(filial ? { filialNome: filial === '__sem_filial__' ? null : filial } : {}),
    ...(intervaloValido ? { criadoEm: {
      gte: new Date(`${de}T00:00:00-03:00`),
      lt: new Date(new Date(`${ate}T00:00:00-03:00`).getTime() + 86400000),
    } } : {}),
  }
  const [resumo, notas, sistemasAgrupados] = await Promise.all([
    prisma.avaliacaoSistema.aggregate({ where, _count: { _all: true }, _avg: { nota: true } }),
    prisma.avaliacaoSistema.groupBy({ by: ['nota'], where, _count: { _all: true } }),
    prisma.avaliacaoSistema.groupBy({ by: ['sistemaSlug'], where, _count: { _all: true }, _avg: { nota: true } }),
  ])
  const total = resumo._count._all
  const media = resumo._avg.nota === null ? '—' : resumo._avg.nota.toFixed(1).replace('.', ',')
  const distribuicao = [5, 4, 3, 2, 1].map((nota) => ({
    nota, total: notas.find((item) => item.nota === nota)?._count._all ?? 0,
  }))
  const porSistema = sistemasCatalogo.flatMap((item) => {
    const grupo = sistemasAgrupados.find((avaliacao) => avaliacao.sistemaSlug === item.slug)
    return grupo ? [{
      nome: item.name,
      slug: item.slug,
      total: grupo._count._all,
      media: grupo._avg.nota === null ? '—' : grupo._avg.nota.toFixed(1).replace('.', ','),
    }] : []
  })

  const paginaSolicitada = typeof parametros.pagina === 'string' && /^[1-9]\d{0,5}$/.test(parametros.pagina)
    ? Number(parametros.pagina) : 1
  const totalPaginas = Math.max(1, Math.ceil(total / RESPOSTAS_POR_PAGINA))
  const pagina = Math.min(paginaSolicitada, totalPaginas)
  const avaliacoes = total === 0 ? [] : await prisma.avaliacaoSistema.findMany({
    where,
    orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }],
    skip: (pagina - 1) * RESPOSTAS_POR_PAGINA,
    take: RESPOSTAS_POR_PAGINA,
    include: { colaborador: { select: { nome: true, departamento: true } } },
  })
  const caminhoDaPagina = (numero: number) => {
    const busca = new URLSearchParams()
    if (sistema) busca.set('sistema', sistema)
    if (filial) busca.set('filial', filial)
    if (de && ate) { busca.set('de', de); busca.set('ate', ate) }
    busca.set('pagina', String(numero))
    return `/admin/avaliacoes?${busca}#respostas`
  }

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-7">
        <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">Avaliações dos sistemas</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Notas e sugestões enviadas pelos colaboradores.</p>
      </header>

      <FiltrosAvaliacoes
        sistemaInicial={sistema}
        filialInicial={filial}
        deInicial={de}
        ateInicial={ate}
        sistemas={sistemasCatalogo.map((item) => ({ value: item.slug, label: item.name }))}
        filiais={[
          ...nomesFiliais.map((nome) => ({ value: nome, label: nome })),
          ...(semFilial ? [{ value: '__sem_filial__', label: 'Sem filial' }] : []),
        ]}
      />

      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
          <p className="text-sm text-ink-500 dark:text-ink-400">Média das estrelas</p>
          <p className="mt-1 text-3xl font-semibold text-ink-900 dark:text-ink-50">{media}{total > 0 && <span className="ml-2 text-lg text-amber-500">★</span>}</p>
          <p className="mt-1 text-xs text-ink-400">{total} {total === 1 ? 'avaliação' : 'avaliações'} no período</p>
        </div>
        <div className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
          <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">Distribuição das notas</p>
          <div className="space-y-2">{distribuicao.map((linha) => (
            <div key={linha.nota} className="flex items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
              <span className="w-7 text-right">{linha.nota} ★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-700"><div className="h-full rounded-full bg-amber-400" style={{ width: `${total ? linha.total / total * 100 : 0}%` }} /></div>
              <span className="w-7 tabular-nums">{linha.total}</span>
            </div>
          ))}</div>
        </div>
      </div>

      {!sistema && porSistema.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-50">Por sistema</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{porSistema.map((item) => (
            <Link key={item.slug} href={`/admin/avaliacoes?sistema=${encodeURIComponent(item.slug)}${filial ? `&filial=${encodeURIComponent(filial)}` : ''}${de && ate ? `&de=${de}&ate=${ate}` : ''}`} className="rounded-xl border border-ink-200 bg-white p-4 transition hover:border-brand-300 dark:border-ink-800 dark:bg-ink-800">
              <span className="font-medium text-ink-800 dark:text-ink-100">{item.nome}</span>
              <span className="mt-2 block text-sm text-ink-500 dark:text-ink-400">{item.media} ★ · {item.total} {item.total === 1 ? 'resposta' : 'respostas'}</span>
            </Link>
          ))}</div>
        </section>
      )}

      <section id="respostas" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50">Respostas</h2>
          {total > 0 && <p className="text-xs text-ink-500 dark:text-ink-400">Mostrando {(pagina - 1) * RESPOSTAS_POR_PAGINA + 1}–{Math.min(pagina * RESPOSTAS_POR_PAGINA, total)} de {total}</p>}
        </div>
        {total === 0 ? <p className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-500 dark:border-ink-800">Nenhuma avaliação encontrada para este filtro.</p> : (
          <div className="space-y-3">{avaliacoes.map((item) => (
            <RespostaAvaliacao
              key={item.id}
              sistema={sistemasCatalogo.find((sistema) => sistema.slug === item.sistemaSlug)?.name ?? item.sistemaSlug}
              nota={item.nota}
              data={dataFormatada.format(item.criadoEm)}
              autor={`${item.colaborador.nome} · ${item.filialNome ?? 'Sem filial'}${item.colaborador.departamento ? ` · ${item.colaborador.departamento}` : ''}`}
              respostas={{ gosta: item.gosta, melhorar: item.melhorar, gostaria: item.gostaria }}
            />
          ))}</div>
        )}
        {totalPaginas > 1 && (
          <nav aria-label="Páginas das respostas" className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {pagina > 1 ? <Link href={caminhoDaPagina(pagina - 1)} className="inline-flex min-h-11 items-center rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-700 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200">Anterior</Link> : <span className="inline-flex min-h-11 items-center rounded-lg border border-ink-200 px-4 text-sm text-ink-400 dark:border-ink-800" aria-disabled="true">Anterior</span>}
            <span className="text-sm text-ink-600 dark:text-ink-300">Página {pagina} de {totalPaginas}</span>
            {pagina < totalPaginas ? <Link href={caminhoDaPagina(pagina + 1)} className="inline-flex min-h-11 items-center rounded-lg border border-ink-200 bg-white px-4 text-sm text-ink-700 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200">Próxima</Link> : <span className="inline-flex min-h-11 items-center rounded-lg border border-ink-200 px-4 text-sm text-ink-400 dark:border-ink-800" aria-disabled="true">Próxima</span>}
          </nav>
        )}
      </section>
    </div>
  )
}
