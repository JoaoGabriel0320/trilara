// src/app/(sistema)/admin/page.tsx — gestão de documentos

import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { exigirEditor } from '@/lib/auth/session'
import { TabelaDocumentos } from '@/components/kb/TabelaDocumentos'

export const metadata: Metadata = {
  title: 'Meus documentos · Trilara',
  robots: { index: false, follow: false },
}

// A data sai pronta do servidor, com fuso fixo: formatar no cliente daria
// divergência de hidratação perto da meia-noite (fuso do servidor ≠ navegador).
const formatoData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

function Indicador({ rotulo, valor, detalhe }: { rotulo: string; valor: number; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-5 py-4 dark:border-ink-800 dark:bg-ink-800/40">
      <p className="text-[13px] font-medium text-ink-500 dark:text-ink-400">{rotulo}</p>
      <p className="mt-1 text-[28px] font-semibold tabular-nums tracking-tight text-ink-900 dark:text-ink-50">
        {valor.toLocaleString('pt-BR')}
      </p>
      {detalhe && <p className="mt-0.5 text-[12.5px] text-ink-400">{detalhe}</p>}
    </div>
  )
}

export default async function MeusDocumentosPage() {
  const sistemasCatalogo = await listarSistemas()
  const sessao = await exigirEditor()

  const documentos = await prisma.documento.findMany({
    where: { autorId: sessao.id },
    // Na gestão, o que mexeu por último aparece primeiro. A ordem de exibição
    // para o leitor (campo `ordem`) continua valendo na área de documentação.
    orderBy: { atualizadoEm: 'desc' },
    select: {
      id: true,
      sistemaSlug: true,
      slug: true,
      titulo: true,
      tipo: true,
      publico: true,
      ativo: true,
      visualizacoes: true,
      atualizadoEm: true,
      criadoEm: true,
      autor: { select: { nome: true } },
      categoria: { select: { nome: true } },
    },
  })

  const publicados = documentos.filter((d) => d.ativo).length
  const leituras = documentos.reduce((soma, d) => soma + d.visualizacoes, 0)
  const sistemasCobertos = new Set(documentos.map((d) => d.sistemaSlug)).size

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Meus documentos</h1>
          <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">
            Adicione documentação e atualize apenas os documentos criados por você.
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Link
            href="/meus-documentos/novo"
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 sm:flex-none"
          >
            <Plus className="size-[18px]" aria-hidden />
            Novo documento
          </Link>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Indicador
          rotulo="Documentos"
          valor={documentos.length}
          detalhe={`em ${sistemasCobertos} ${sistemasCobertos === 1 ? 'sistema' : 'sistemas'}`}
        />
        <Indicador rotulo="Publicados" valor={publicados} detalhe="visíveis para os colaboradores" />
        <Indicador rotulo="Rascunhos" valor={documentos.length - publicados} detalhe="só a equipe vê" />
        <Indicador rotulo="Leituras" valor={leituras} detalhe="somando todos os documentos" />
      </div>

      {documentos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 px-6 py-16 text-center dark:border-ink-700">
          <p className="text-[16px] font-medium text-ink-800 dark:text-ink-100">Nenhum documento ainda</p>
          <p className="mt-1.5 text-[14px] text-ink-500 dark:text-ink-400">
            Comece publicando o manual do sistema que mais gera dúvidas.
          </p>
        </div>
      ) : (
        <TabelaDocumentos administrador={false} destinoEdicao="/meus-documentos"
          documentos={documentos.map((d) => ({
            autorNome: d.autor?.nome ?? "Autor não informado",
            criadoEm: formatoData.format(d.criadoEm),
            id: d.id,
            titulo: d.titulo,
            slug: d.slug,
            sistemaSlug: d.sistemaSlug,
            sistemaNome: sistemasCatalogo.find((sistema) => sistema.slug === d.sistemaSlug)?.name ?? d.sistemaSlug,
            categoriaNome: d.categoria?.nome ?? null,
            tipo: d.tipo,
            publico: d.publico,
            ativo: d.ativo,
            visualizacoes: d.visualizacoes,
            // "24 de set. de 2026" → "24 set 2026"
            atualizadoEm: formatoData.format(d.atualizadoEm).replace(/\./g, '').replace(/ de /g, ' '),
          }))}
        />
      )}
    </div>
  )
}
