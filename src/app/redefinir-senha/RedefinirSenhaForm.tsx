'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EyeIcon, EyeOffIcon, LockKeyholeIcon } from 'lucide-react'

export function RedefinirSenhaForm({ token }: { token: string }) {
  const router = useRouter()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [visivel, setVisivel] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    if (novaSenha !== confirmacao) { setErro('As senhas não conferem.'); return }
    setEnviando(true)
    try {
      const resposta = await fetch('/api/redefinir-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, novaSenha }) })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) setErro(dados.error ?? 'Não foi possível redefinir a senha.')
      else { router.replace('/login?senhaRedefinida=1'); router.refresh() }
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setEnviando(false) }
  }

  return <form onSubmit={enviar} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
    <LockKeyholeIcon size={24} className="text-ink-300" aria-hidden="true" />
    <h1 className="mt-3 text-xl font-semibold text-white">Crie uma nova senha</h1>
    <p className="mt-2 text-sm text-ink-400">Use entre 8 e 72 caracteres. Este link funciona uma única vez.</p>
    <label htmlFor="nova-senha" className="mt-6 block text-sm font-semibold text-white">Nova senha</label>
    <div className="relative mt-2"><input id="nova-senha" type={visivel ? 'text' : 'password'} value={novaSenha} onChange={(evento) => setNovaSenha(evento.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="min-h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 pr-11 text-white outline-none focus:border-brand-400" /><button type="button" onClick={() => setVisivel((valor) => !valor)} aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-ink-400">{visivel ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}</button></div>
    <label htmlFor="confirmar-senha" className="mt-5 block text-sm font-semibold text-white">Confirmar nova senha</label>
    <input id="confirmar-senha" type={visivel ? 'text' : 'password'} value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-white outline-none focus:border-brand-400" />
    {erro && <p role="alert" className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">{erro}</p>}
    <button type="submit" disabled={enviando} className="mt-6 min-h-11 w-full rounded-lg bg-white px-4 font-semibold text-ink-900 transition hover:bg-ink-100 disabled:opacity-50">{enviando ? 'Salvando…' : 'Salvar nova senha'}</button>
  </form>
}
