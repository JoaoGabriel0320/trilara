import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthPage } from '@/components/ui/auth-page'
import { SolicitarAcessoForm } from './SolicitarAcessoForm'

export const metadata: Metadata = { title: 'Solicitar acesso · Trilara', robots: { index: false, follow: false } }

export default function SolicitarAcessoPage() {
  return <AuthPage>
    <SolicitarAcessoForm />
    <Link href="/login" className="text-sm text-ink-200 underline underline-offset-4">Voltar para entrar</Link>
  </AuthPage>
}
