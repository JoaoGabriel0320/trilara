import { exigirAdmin } from '@/lib/auth/session'
// src/app/(sistema)/admin/secoes/page.tsx — gerenciar as seções de cada sistema
//
// Fica dentro de /admin (não de /admin/usuarios): seção é conteúdo, quem
// publica documento (EDITOR) já mexe nisso hoje pelo "Criar nova seção" do
// formulário — esta tela só dá o resto (renomear, desativar, excluir).

import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { listarSistemas } from '@/lib/sistemas'
import { GerenciarSecoes } from '@/components/kb/GerenciarSecoes'

export const metadata: Metadata = {
  title: 'Seções · Trilara',
  robots: { index: false, follow: false },
}

export default async function SecoesPage() {
  await exigirAdmin()
  const sistemasCatalogo = await listarSistemas()
  const categorias = await prisma.categoria.findMany({
    orderBy: [{ sistemaSlug: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      sistemaSlug: true,
      ativo: true,
      _count: { select: { documentos: true } },
    },
  })

  const secoes = categorias.map((c) => ({
    id: c.id,
    nome: c.nome,
    sistemaSlug: c.sistemaSlug,
    ativo: c.ativo,
    totalDocumentos: c._count.documentos,
  }))

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 xl:px-10">
      <Link href="/admin" className="text-sm text-brand-600 dark:text-brand-400">
        ← Documentos
      </Link>
      <h1 className="my-6 text-2xl font-semibold text-ink-900 dark:text-white">Seções</h1>
      <p className="-mt-4 mb-6 text-sm text-ink-500 dark:text-ink-400">
        As seções organizam os documentos dentro de cada sistema — é o que aparece no campo "Seção" ao cadastrar um documento.
      </p>
      <GerenciarSecoes
        secoes={secoes}
        sistemas={sistemasCatalogo.map((s) => ({ slug: s.slug, name: s.name }))}
      />
    </div>
  )
}
