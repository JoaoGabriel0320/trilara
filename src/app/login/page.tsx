// src/app/login/page.tsx
//
// Porta do portal interno. Fica fora do grupo (site), então não recebe a
// navbar institucional: quem chega aqui está entrando num sistema, não
// navegando um site. A moldura visual é o AuthPage (components/ui); esta
// página só decide o destino e monta o formulário.

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessao } from '@/lib/auth/session'
import { AuthPage } from '@/components/ui/auth-page'
import { LoginForm } from './LoginForm'
import { destinoAposLogin } from '@/lib/destino-login'

export const metadata: Metadata = {
  title: 'Entrar · Trilara',
  description: 'Acesso à documentação interna dos sistemas',
  robots: { index: false, follow: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; senhaRedefinida?: string; motivo?: string }>
}) {
  const sessao = await getSessao()
  if (sessao) redirect('/inicio')

  const { destino, senhaRedefinida, motivo } = await searchParams

  // Só aceitamos destino interno: `?destino=https://site-malicioso` viraria um
  // open redirect usando o nosso login como isca.
  const destinoSeguro = destinoAposLogin(destino)

  return (
    <AuthPage>
      {senhaRedefinida === '1' && <p role="status" className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">Senha redefinida. Entre com a nova senha.</p>}
      {motivo === 'novo-login' && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">Esta conta foi acessada em outro navegador ou dispositivo. Sua sessão foi encerrada. Se não foi você, redefina sua senha e avise o administrador.</p>}
      {motivo === 'sessao-expirada' && <p role="status" className="rounded-xl border border-ink-500/30 bg-ink-500/10 px-4 py-3 text-sm text-ink-100">Sua sessão expirou. Entre novamente para continuar.</p>}
      <LoginForm destino={destinoSeguro} />

      <p className="text-sm text-ink-400">
        Sem acesso? {' '}
        <Link href="/solicitar-acesso" className="text-ink-200 underline underline-offset-4 transition hover:text-white">
          Solicite seu acesso
        </Link>
        .
      </p>
    </AuthPage>
  )
}
