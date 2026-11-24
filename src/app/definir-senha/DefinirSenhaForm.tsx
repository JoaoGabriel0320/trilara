'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const campo =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-ink-600 focus:border-brand-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-brand-500/15'

export function DefinirSenhaForm() {
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    if (novaSenha.length < 8) {
      setErro('A senha precisa ter ao menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('A confirmação não bate com a nova senha.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/definir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ novaSenha }),
      })
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível salvar. Tente novamente.')
        setEnviando(false)
        return
      }

      router.refresh()
      router.push('/inicio')
    } catch {
      setErro('Falha de conexão. Tente novamente.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="rounded-2xl border border-white/10 bg-ink-800/70 p-6 shadow-2xl backdrop-blur-xl">
      <label className="block">
        <span className="rotulo text-ink-400">Nova senha</span>
        <input
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
          autoComplete="new-password"
          autoFocus
          className={campo}
        />
      </label>

      <label className="mt-4 block">
        <span className="rotulo text-ink-400">Confirmar nova senha</span>
        <input
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
          className={campo}
        />
      </label>

      {erro && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-[13px] text-rose-300">
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 w-full rounded-xl bg-brand-500 px-4 py-2.5 text-[14px] font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Salvando…' : 'Salvar e entrar'}
      </button>
    </form>
  )
}
