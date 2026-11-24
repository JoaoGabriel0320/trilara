'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { AtSignIcon, EyeIcon, EyeOffIcon, LockIcon, LogInIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// A tela de login é sempre escura (ver AuthPage), então os campos fixam as
// cores escuras também no tema claro — por isso as sobreposições dark:.
const campo =
  'h-11 border-white/10 bg-white/[0.03] ps-10 text-white placeholder:text-ink-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-white'

export function LoginForm({ destino }: { destino: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível entrar. Tente novamente.')
        setEnviando(false)
        return
      }

      // refresh() antes do push: as páginas do portal são Server Components e
      // o router cache traria a versão renderizada sem sessão. Senha
      // temporária pula direto pra troca — ir para `destino` só adicionaria
      // um redirect a mais, o proxy mandaria pra cá de qualquer jeito.
      router.refresh()
      router.push(dados.mustChangePassword ? '/definir-senha' : destino)
    } catch {
      setErro('Falha de conexão. Verifique sua rede e tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="portal-in rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-white">
          <LogInIcon className="size-5 text-ink-300" aria-hidden />
          Entrar
        </h1>
        <p className="mt-1 text-sm text-ink-400">Use o e-mail e a senha da sua conta Trilara.</p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold text-white">
            E-mail
          </label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              autoFocus
              placeholder="voce@exemplo.com"
              className={campo}
            />
            <AtSignIcon
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="senha" className="block text-sm font-semibold text-white">
            Senha
          </label>
          <div className="relative">
            <Input
              id="senha"
              type={verSenha ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              className={campo + ' pe-11'}
            />
            <LockIcon
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden
            />
            <button
              type="button"
              onClick={() => setVerSenha((v) => !v)}
              aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute end-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-500 transition hover:bg-white/5 hover:text-ink-200"
            >
              {verSenha ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 text-right">
        <Link href="/recuperar-senha" className="text-[13px] font-medium text-ink-300 underline underline-offset-4 transition hover:text-white">Redefinição de senha</Link>
      </div>

      {erro && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300"
        >
          {erro}
        </p>
      )}

      <Button type="submit" variant="claro" size="lg" disabled={enviando} className="mt-6 w-full">
        {enviando ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  )
}
