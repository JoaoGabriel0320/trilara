import { exigirAdmin } from '@/lib/auth/session'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { FilaRelatos } from '@/components/kb/FilaRelatos'

export const metadata: Metadata = { title: 'Relatos de documentos · Trilara', robots: { index: false, follow: false } }

const formatoData = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })

export default async function RelatosPage() {
  await exigirAdmin()
  const [relatos, abertos] = await Promise.all([
    prisma.relatoDocumento.findMany({
      orderBy: [{ status: 'asc' }, { criadoEm: 'desc' }],
      take: 100,
      include: { documento: { select: { slug: true, ativo: true } } },
    }),
    prisma.relatoDocumento.count({ where: { status: 'ABERTO' } }),
  ])
  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-7">
        <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
        <h1 className="mt-2 text-[28px] font-semibold text-ink-900 dark:text-ink-50">Relatos sobre documentos</h1>
        <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">{abertos} {abertos === 1 ? 'relato aberto' : 'relatos abertos'} · recebidos dos colaboradores para a equipe de TI.</p>
      </header>
      <FilaRelatos relatos={relatos.map((relato) => ({
        id: relato.id,
        tituloDocumento: relato.tituloDocumento,
        sistemaSlug: relato.sistemaSlug,
        autorNome: relato.autorNome,
        mensagem: relato.mensagem,
        status: relato.status,
        criadoEm: formatoData.format(relato.criadoEm),
        resolvidoPor: relato.resolvidoPor,
        passo: relato.passoNumero ? { numero: relato.passoNumero, titulo: relato.passoTitulo } : null,
        documentoUrl: relato.documento?.ativo ? `/documentacao/${relato.sistemaSlug}/${relato.documento.slug}${relato.passoNumero ? `#passo-${relato.passoNumero}` : ''}` : null,
      }))} />
    </div>
  )
}
