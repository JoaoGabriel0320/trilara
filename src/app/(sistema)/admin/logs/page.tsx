import Link from 'next/link'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { exigirAdmin } from '@/lib/auth/session'
import { FiltroHistoricoDocumentos } from '@/components/kb/FiltroHistoricoDocumentos'

export const metadata: Metadata = { title: 'Histórico de atividades · Trilara', robots: { index: false, follow: false } }
const tamanho = 10
const acoesDocumento = { criar: 'Criação', editar: 'Edição', excluir: 'Exclusão', publicar: 'Publicação', despublicar: 'Despublicação' } as const
const acoes = { login: 'Acesso à plataforma', ...acoesDocumento } as const
const formato = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ pagina?: string; acao?: string; usuario?: string }> }) {
  await exigirAdmin()
  const params = await searchParams
  const paginaPedida = Math.max(1, Math.min(100000, Number(params.pagina) || 1))
  const acao = params.acao && Object.hasOwn(acoes, params.acao) ? params.acao : undefined
  const usuario = typeof params.usuario === 'string' ? params.usuario.trim().slice(0, 100) : ''
  const tipoDeRegistro: Prisma.AuditLogWhereInput = acao === 'login'
    ? { entidade: 'Colaborador', acao: 'login' }
    : acao
      ? { entidade: 'Documento', acao }
      : { OR: [
        { entidade: 'Documento', acao: { in: Object.keys(acoesDocumento) } },
        { entidade: 'Colaborador', acao: 'login' },
      ] }
  const where: Prisma.AuditLogWhereInput = {
    ...tipoDeRegistro,
    ...(usuario ? { AND: [{ OR: [
      { actorNome: { contains: usuario, mode: 'insensitive' } },
      { actorEmail: { contains: usuario, mode: 'insensitive' } },
    ] }] } : {}),
  }
  const total = await prisma.auditLog.count({ where })
  const paginas = Math.max(1, Math.ceil(total / tamanho))
  const pagina = Math.min(paginas, Math.floor(paginaPedida))
  const logs = await prisma.auditLog.findMany({ where, orderBy: [{ criadoEm: 'desc' }, { id: 'desc' }], skip: (pagina - 1) * tamanho, take: tamanho })
  const url = (p: number) => '/admin/logs?' + new URLSearchParams({ pagina: String(p), ...(acao ? { acao } : {}), ...(usuario ? { usuario } : {}) }).toString()
  const primeiraPaginaVisivel = Math.max(1, Math.min(pagina - 2, paginas - 4))
  const paginasVisiveis = Array.from(
    { length: Math.min(5, paginas) },
    (_, indice) => primeiraPaginaVisivel + indice,
  )
  const ultimaPaginaVisivel = primeiraPaginaVisivel + paginasVisiveis.length - 1
  return <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 xl:px-10">
    <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">Histórico de atividades</h1>
    <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Acessos à plataforma e alterações em documentos. Datas e horários de Brasília.</p>
    <FiltroHistoricoDocumentos
      acaoInicial={acao ?? ''}
      usuarioInicial={usuario}
      opcoes={[{ value: '', label: 'Todas' }, ...Object.entries(acoes).map(([value, label]) => ({ value, label }))]}
    />
    <p className="mb-3 text-sm text-ink-500 dark:text-ink-400">
      {total === 0 ? 'Nenhum registro' : `Exibindo ${(pagina - 1) * tamanho + 1}–${Math.min(pagina * tamanho, total)} de ${total} registros`}
    </p>
    <div className="overflow-x-auto rounded-xl border border-ink-200 dark:border-ink-700">
      <table className="mobile-history-table w-full text-left text-sm"><thead className="bg-ink-100 dark:bg-ink-800"><tr>{['Data e hora', 'Responsável', 'Ação', 'Detalhes'].map(t => <th key={t} className="px-4 py-3">{t}</th>)}</tr></thead>
        <tbody>{logs.map(log => <tr key={log.id} className="border-t border-ink-200 dark:border-ink-700"><td className="whitespace-nowrap px-4 py-3"><time dateTime={log.criadoEm.toISOString()}>{formato.format(log.criadoEm)}</time></td><td className="px-4 py-3">{log.actorNome}<span className="block text-xs text-ink-500">{log.actorEmail}</span></td><td className="px-4 py-3">{acoes[log.acao as keyof typeof acoes] ?? log.acao}</td><td className="px-4 py-3">{log.descricao}</td></tr>)}</tbody>
      </table>{!logs.length && <p className="p-6 text-sm text-ink-500">Nenhum registro encontrado.</p>}
    </div>
    <nav aria-label="Paginação do histórico" className="mobile-pagination mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-ink-500 dark:text-ink-400">Página {pagina} de {paginas}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {pagina > 1 && <Link href={url(pagina - 1)} scroll={false} className="rounded-lg border border-ink-200 px-3 py-2 font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200">Anterior</Link>}
        {primeiraPaginaVisivel > 1 && <Link href={url(1)} scroll={false} aria-label="Ir para a página 1" className="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">1</Link>}
        {primeiraPaginaVisivel > 2 && <span aria-hidden="true" className="px-1 text-ink-400">…</span>}
        {paginasVisiveis.map((numero) => numero === pagina ? (
          <span key={numero} aria-current="page" className="rounded-lg bg-brand-500 px-3 py-2 font-semibold text-white">{numero}</span>
        ) : (
          <Link key={numero} href={url(numero)} scroll={false} aria-label={`Ir para a página ${numero}`} className="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">{numero}</Link>
        ))}
        {ultimaPaginaVisivel < paginas - 1 && <span aria-hidden="true" className="px-1 text-ink-400">…</span>}
        {ultimaPaginaVisivel < paginas && <Link href={url(paginas)} scroll={false} aria-label={`Ir para a página ${paginas}`} className="rounded-lg px-3 py-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">{paginas}</Link>}
        {pagina < paginas && <Link href={url(pagina + 1)} scroll={false} className="rounded-lg border border-ink-200 px-3 py-2 font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200">Próxima</Link>}
      </div>
    </nav>
  </div>
}
