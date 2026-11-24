import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { hashTokenReset, tokenResetValido } from '@/lib/reset-senha'
import { AuthPage } from '@/components/ui/auth-page'
import { RedefinirSenhaForm } from './RedefinirSenhaForm'

export const metadata: Metadata = { title: 'Nova senha · Trilara', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  const valido = tokenResetValido(token) && Boolean(await prisma.colaborador.findFirst({ where: { resetToken: hashTokenReset(token), resetTokenExpiry: { gt: new Date() }, ativo: true }, select: { id: true } }))
  return <AuthPage>
    {valido ? <RedefinirSenhaForm token={token} /> : <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl"><h1 className="text-xl font-semibold text-white">Link inválido ou expirado</h1><p className="mt-2 text-sm text-ink-300">Solicite um novo link para redefinir sua senha.</p><Link href="/recuperar-senha" className="mt-5 inline-flex text-sm font-semibold text-white underline underline-offset-4">Solicitar novo link</Link></div>}
    <Link href="/login" className="text-sm text-ink-200 underline underline-offset-4">Voltar para entrar</Link>
  </AuthPage>
}
