import { exigirAdmin } from '@/lib/auth/session'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { LiberacoesAcesso } from '@/components/kb/LiberacoesAcesso'

export default async function LiberacoesPage() {
  await exigirAdmin()
  const solicitacoes = await prisma.solicitacaoAcesso.findMany({ where: { status: 'PENDENTE' }, orderBy: { criadaEm: 'asc' }, include: { filial: { select: { nome: true } } } })
  return <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 xl:px-10"><Link href="/admin/usuarios" className="text-sm text-brand-600">← Colaboradores</Link><h1 className="my-6 text-2xl font-semibold text-ink-900 dark:text-white">Liberações de acesso</h1><p className="mb-5 text-sm text-ink-500">Confirme a identidade e, para externos, o vínculo com a empresa antes de aprovar. O e-mail ainda não é verificado automaticamente.</p><LiberacoesAcesso solicitacoes={solicitacoes.map(({ id, nome, email, tipoAcesso, empresaNome, departamento, filial, criadaEm, status }) => ({ id, nome, email, tipoAcesso, empresaNome, departamento, filial, criadaEm: criadaEm.toISOString(), status }))} /></div>
}
