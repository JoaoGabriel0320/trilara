import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { exigirInterno } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { limiteConsultas } from '@/lib/assistente-consultas'
import type { FonteAssistente } from '@/lib/assistente-hub'
import { ConversasRecentes } from '@/components/portal/ConversasRecentes'
import { listarSistemas } from '@/lib/sistemas'
import { AssistenteHub } from '@/components/portal/AssistenteHub'
import { sistemaSlugCanonico } from '@/lib/sistema-canonico'
import { ASSISTENTE_ATIVO } from '@/lib/recursos'

export const metadata: Metadata = {
  title: 'Assistente dos manuais · Trilara',
  robots: { index: false, follow: false },
}

export default async function AssistentePage({ searchParams }: { searchParams: Promise<{ sistema?: string; conversa?: string; consulta?: string }> }) {
  if (!ASSISTENTE_ATIVO) notFound()
  const sessao = await exigirInterno()
  const [sistemas, parametros] = await Promise.all([listarSistemas(), searchParams])
  await prisma.conversaAssistente.deleteMany({ where: { atualizadaEm: { lt: limiteConsultas() } } })
  const idSolicitado = parametros.conversa ?? parametros.consulta
  const conversaId = typeof idSolicitado === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idSolicitado) ? idSolicitado : null
  const [conversas, selecionada] = await Promise.all([
    prisma.conversaAssistente.findMany({
      where: { colaboradorId: sessao.id },
      orderBy: { atualizadaEm: 'desc' },
      take: 20,
      select: { id: true, titulo: true, sistemaSlug: true, atualizadaEm: true },
    }),
    conversaId ? prisma.conversaAssistente.findFirst({
      where: { id: conversaId, colaboradorId: sessao.id },
      include: { consultas: { orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }] } },
    }) : Promise.resolve(null),
  ])
  const sistemaSolicitado = typeof parametros.sistema === 'string' ? sistemaSlugCanonico(parametros.sistema) : ''
  const sistemaInicial = sistemas.some((item) => item.slug === sistemaSolicitado) ? sistemaSolicitado : null
  const conversaInicial = selecionada ? {
    id: selecionada.id,
    sistemaSlug: sistemas.some((item) => item.slug === selecionada.sistemaSlug) ? selecionada.sistemaSlug : null,
    consultas: selecionada.consultas.map((consulta) => ({
      pergunta: consulta.pergunta,
      resposta: consulta.resposta,
      fontes: consulta.fontes as unknown as FonteAssistente[],
      aviso: consulta.aviso,
    })),
  } : null

  return (
    <div className="portal-page mx-auto w-full max-w-7xl px-4 py-5 sm:px-8 sm:py-10">
      <header className="mb-6">
        <p className="rotulo text-brand-600 dark:text-brand-400">Piloto</p>
        <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Assistente dos manuais</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Faça uma pergunta sobre os sistemas. Nesta primeira versão, o assistente procura trechos nos documentos publicados e mostra de onde veio cada informação.
        </p>

      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="order-2 min-w-0 lg:order-1">
          <AssistenteHub key={conversaInicial?.id ?? sistemaInicial ?? 'nova'} sistemas={sistemas.map((sistema) => ({ slug: sistema.slug, nome: sistema.name }))} sistemaInicial={sistemaInicial} conversaInicial={conversaInicial} />
        </div>
        <div className="order-1 lg:order-2">
          <ConversasRecentes
            conversas={conversas.map((item) => ({ id: item.id, titulo: item.titulo, sistemaSlug: item.sistemaSlug, atualizadaEm: item.atualizadaEm.toISOString() }))}
            sistemas={sistemas.map((item) => ({ slug: item.slug, nome: item.name }))}
            selecionadaId={conversaInicial?.id ?? null}
          />
        </div>
      </div>
    </div>
  )
}
