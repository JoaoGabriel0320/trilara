// src/app/(sistema)/conta/page.tsx — perfil do colaborador logado

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { exigirSessao } from '@/lib/auth/session'
import { FormSenha } from '@/components/portal/FormSenha'
import { FotoPerfil } from '@/components/portal/FotoPerfil'
import { LockKeyhole, UserRound } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Minha conta · Trilara',
  robots: { index: false, follow: false },
}

const ROTULO_PAPEL = { COLABORADOR: 'Colaborador', EDITOR: 'Gestor', ADMIN: 'Administrador' } as const

export default async function ContaPage() {
  const sessao = await exigirSessao()

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: sessao.id },
    select: { tipoAcesso: true, empresaNome: true, nome: true, email: true, departamento: true, filialNome: true, fotoKey: true, papel: true, ultimoLoginEm: true },
  })
  if (!colaborador) notFound()

  return (
    <div className="portal-page w-full px-4 py-5 sm:py-8 sm:px-8 sm:py-10 xl:px-10">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight text-ink-900 dark:text-ink-50 sm:text-[32px]">Minha conta</h1>
        <p className="mt-2 text-[14px] text-ink-500 dark:text-ink-400">Consulte seus dados e atualize a senha de acesso à Trilara.</p>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(320px,1fr)_minmax(0,1.5fr)]">
        <section aria-labelledby="perfil-conta" className="min-w-0 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-200 px-5 py-5 dark:border-ink-700 sm:px-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <UserRound size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 id="perfil-conta" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Meu perfil</h2>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Dados associados à sua conta.</p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <FotoPerfil nome={colaborador.nome} email={colaborador.email} fotoInicial={colaborador.fotoKey} />

            <dl className="mt-6 divide-y divide-ink-200 dark:divide-ink-700">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0">
                <dt className="text-[13px] text-ink-500 dark:text-ink-400">Perfil de acesso</dt>
                <dd className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {colaborador.tipoAcesso === 'EXTERNO' ? 'Cliente / transportadora' : ROTULO_PAPEL[colaborador.papel]}
                </dd>
              </div>
              {colaborador.empresaNome && <div className="flex flex-wrap justify-between gap-4 py-3"><dt className="text-sm text-ink-500">Empresa</dt><dd className="text-sm font-medium">{colaborador.empresaNome}</dd></div>}
              {colaborador.departamento && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                  <dt className="text-[13px] text-ink-500 dark:text-ink-400">Departamento</dt>
                  <dd className="break-words text-right text-[14px] font-medium text-ink-800 dark:text-ink-200">{colaborador.departamento}</dd>
                </div>
              )}
              {colaborador.filialNome && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-3">
                  <dt className="text-[13px] text-ink-500 dark:text-ink-400">Filial</dt>
                  <dd className="break-words text-right text-[14px] font-medium text-ink-800 dark:text-ink-200">{colaborador.filialNome}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>

        <section aria-labelledby="seguranca-conta" className="min-w-0 rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-800">
          <div className="flex items-center gap-3 border-b border-ink-200 px-5 py-5 dark:border-ink-700 sm:px-7">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <LockKeyhole size={21} aria-hidden="true" />
            </span>
            <div>
              <h2 id="seguranca-conta" className="text-[17px] font-semibold text-ink-900 dark:text-ink-50">Alterar senha</h2>
              <p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Use sua senha atual para definir uma nova.</p>
            </div>
          </div>
          <div className="p-5 sm:p-7">
            <FormSenha />
          </div>
        </section>
      </div>
    </div>
  )
}
