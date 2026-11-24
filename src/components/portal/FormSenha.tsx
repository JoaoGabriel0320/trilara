'use client'

// src/components/portal/FormSenha.tsx

import { useState } from 'react'
import { Save } from 'lucide-react'

const campo =
  'mt-2 min-h-12 w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 pr-14 text-[15px] text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50'

function CampoSenha({
  rotulo,
  valor,
  onChange,
  autoComplete,
  minLength,
}: {
  rotulo: string
  valor: string
  onChange: (v: string) => void
  autoComplete: string
  minLength?: number
}) {
  const [visivel, setVisivel] = useState(false)
  return (
    <label className="block">
      <span className="text-[14px] font-medium text-ink-700 dark:text-ink-300">{rotulo}</span>
      <span className="relative block">
        <input
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className={campo}
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={`${visivel ? 'Ocultar' : 'Mostrar'} ${rotulo.toLowerCase()}`}
          aria-pressed={visivel}
          className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-ink-700 dark:hover:text-ink-200"
        >
          {visivel ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C4 8.3 2 11 2 11s3.5 7 10 7c1.3 0 2.5-.27 3.6-.74" />
            </svg>
          )}
        </button>
      </span>
    </label>
  )
}

export function FormSenha() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)

    if (novaSenha !== confirmar) {
      setErro('A confirmação não bate com a nova senha.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/conta/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      const dados = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(dados.error ?? 'Não foi possível atualizar a senha.')
        setEnviando(false)
        return
      }

      setSucesso(true)
      setSenhaAtual('')
      setNovaSenha('')
      setConfirmar('')
    } catch {
      setErro('Falha de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} aria-busy={enviando} className="space-y-6">
      <CampoSenha rotulo="Senha atual" valor={senhaAtual} onChange={setSenhaAtual} autoComplete="current-password" />
      <div>
        <CampoSenha rotulo="Nova senha" valor={novaSenha} onChange={setNovaSenha} autoComplete="new-password" minLength={8} />
        <p className="mt-2 text-[13px] text-ink-500 dark:text-ink-400">Use pelo menos 8 caracteres.</p>
      </div>
      <CampoSenha rotulo="Confirmar nova senha" valor={confirmar} onChange={setConfirmar} autoComplete="new-password" />

      {erro && (
        <p role="alert" className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2.5 text-[13px] text-rose-700 dark:text-rose-300">
          {erro}
        </p>
      )}
      {sucesso && (
        <p role="status" className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 text-[13px] text-emerald-700 dark:text-emerald-300">
          Senha atualizada.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-ink-200 pt-6 dark:border-ink-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-ink-500 dark:text-ink-400">Sua nova senha será usada no próximo acesso.</p>
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-7 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
        >
          <Save size={19} aria-hidden="true" />
          {enviando ? 'Salvando…' : 'Atualizar senha'}
        </button>
      </div>
    </form>
  )
}
