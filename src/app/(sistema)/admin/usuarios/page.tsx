import { exigirAdmin } from '@/lib/auth/session'
// src/app/(sistema)/admin/usuarios/page.tsx — gestão de colaboradores

import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { TabelaUsuarios } from '@/components/kb/TabelaUsuarios'
import { desdePresencaOnline } from '@/lib/presenca'
import { getSessao } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: 'Usuários · Trilara',
  robots: { index: false, follow: false },
}

export default async function UsuariosPage() {
  await exigirAdmin()
  const sessao = await getSessao()
  const colaboradores = await prisma.colaborador.findMany({
    where: { adminProtegido: false },
    orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
    select: {
      id: true,
      nome: true,
      email: true,
      fotoKey: true,
      departamento: true,
      filialNome: true,
      papel: true,
      tipoAcesso: true,
      empresaNome: true,
      ativo: true,
      adminProtegido: true,
      mustChangePassword: true,
      ultimoLoginEm: true,
      ultimaAtividadeEm: true,
      criadoEm: true,
    },
  })
  const filiais = await prisma.filial.findMany({
    orderBy: { nome: 'asc' },
    select: { nome: true },
  })
  const pendentes = await prisma.solicitacaoAcesso.count({ where: { status: 'PENDENTE' } })
  const onlineDesde = desdePresencaOnline()

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="rotulo text-brand-600 dark:text-brand-400">Módulo</p>
          <h1 className="mt-2 text-[26px] font-semibold tracking-tight text-ink-900 dark:text-ink-50">
            Usuários
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-500 dark:text-ink-400">
            {colaboradores.length} {colaboradores.length === 1 ? 'cadastrado' : 'cadastrados'} ·{' '}
            {colaboradores.filter((c) => c.ativo).length} ativos
          </p>
        </div>

        <Link
          href="/admin/usuarios/novo"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 sm:w-auto"
        >
          <UserPlus size={20} aria-hidden="true" />
          Novo usuário
        </Link>
      </header>

      <nav className="mb-6 flex flex-wrap gap-3 text-sm font-medium">
        <Link href="/admin/usuarios/liberacoes" className="rounded-xl border border-ink-200 px-4 py-3 text-brand-600 dark:border-ink-700 dark:text-brand-400">Liberações de acesso{pendentes > 0 ? ` (${pendentes})` : ''}</Link>
        <Link href="/admin/usuarios/filiais" className="rounded-xl border border-ink-200 px-4 py-3 text-brand-600 dark:border-ink-700 dark:text-brand-400">Gerenciar filiais</Link>
        <Link href="/admin/usuarios/departamentos" className="rounded-xl border border-ink-200 px-4 py-3 text-brand-600 dark:border-ink-700 dark:text-brand-400">Gerenciar departamentos</Link>
      </nav>

      {colaboradores.length === 0 ? (
        <p className="rounded-xl border border-dashed border-ink-200 px-6 py-12 text-center text-[14px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
          Nenhum colaborador cadastrado ainda.
        </p>
      ) : (
        <TabelaUsuarios
          usuarioAtualId={sessao?.id ?? ''}
          filiais={filiais.map((filial) => filial.nome)}
          usuarios={colaboradores.map((c) => ({
            id: c.id,
            nome: c.nome,
            email: c.email,
            fotoKey: c.fotoKey,
            departamento: c.departamento,
            filialNome: c.filialNome,
            papel: c.papel,
            tipoAcesso: c.tipoAcesso,
            empresaNome: c.empresaNome,
            ativo: c.ativo,
            adminProtegido: c.adminProtegido,
            mustChangePassword: c.mustChangePassword,
            ultimoLoginEm: c.ultimoLoginEm ? c.ultimoLoginEm.toISOString() : null,
            online: c.ativo && c.ultimaAtividadeEm !== null && c.ultimaAtividadeEm >= onlineDesde,
            criadoEm: c.criadoEm.toISOString(),
          }))}
        />
      )}
    </div>
  )
}
