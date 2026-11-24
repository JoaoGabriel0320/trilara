// src/app/definir-senha/page.tsx
//
// Passo obrigatório entre o login com senha temporária e o portal. Mesmo
// visual de tela cheia do /login — o colaborador ainda está "entrando",
// não navegando o produto, então não recebe o shell com sidebar.

import type { Metadata } from 'next'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth/session'
import { DefinirSenhaForm } from './DefinirSenhaForm'

export const metadata: Metadata = {
  title: 'Defina sua senha · Trilara',
  robots: { index: false, follow: false },
}

export default async function DefinirSenhaPage() {
  const sessao = await getSessao()
  if (!sessao) redirect('/login')
  // Já tem senha definitiva — nada a fazer aqui.
  if (!sessao.mustChangePassword) redirect('/inicio')

  return (
    <div className="auth-page relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-ink-900 px-5 py-12">
      <div className="malha-portal pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-[-12%] h-[420px] w-[620px] -translate-x-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #12aa99 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="portal-in relative w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <Image src="/brand/trilara-logo-dark.svg" alt="Trilara" width={150} height={40} className="mx-auto h-10 w-auto" priority />
          <p className="rotulo mt-5 text-ink-500">Primeiro acesso</p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-white">Defina sua senha</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-400">
            Você entrou com a senha temporária. Escolha uma nova senha só sua para continuar.
          </p>
        </div>

        <DefinirSenhaForm />
      </div>
    </div>
  )
}
