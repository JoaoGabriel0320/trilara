import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthPage } from '@/components/ui/auth-page'
import { RecuperarSenhaForm } from './RecuperarSenhaForm'

export const metadata: Metadata = { title: 'Recuperar senha · Trilara', robots: { index: false, follow: false } }

export default function RecuperarSenhaPage() {
  return <AuthPage>
    <RecuperarSenhaForm />
    <Link href="/login" className="text-sm text-ink-200 underline underline-offset-4">Voltar para entrar</Link>
  </AuthPage>
}
