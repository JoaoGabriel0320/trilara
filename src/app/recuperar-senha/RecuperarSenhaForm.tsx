'use client'

import { useState } from 'react'
import { AtSignIcon, MailCheckIcon } from 'lucide-react'

export function RecuperarSenhaForm() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [concluido, setConcluido] = useState(false)

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const resposta = await fetch('/api/recuperar-senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) setErro(dados.error ?? 'Não foi possível solicitar a redefinição.')
      else setConcluido(true)
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setEnviando(false) }
  }

  if (concluido) return <div role="status" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
    <MailCheckIcon size={25} className="text-emerald-300" aria-hidden="true" />
    <h1 className="mt-4 text-xl font-semibold text-white">Confira seu e-mail</h1>
    <p className="mt-2 text-sm leading-relaxed text-ink-300">Se houver uma conta ativa para <strong>{email}</strong>, enviaremos um link para redefinir a senha. O link vale por 30 minutos.</p>
  </div>

  return <form onSubmit={enviar} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl">
    <h1 className="text-xl font-semibold text-white">Redefinição de senha</h1>
    <p className="mt-2 text-sm leading-relaxed text-ink-400">Informe seu e-mail cadastrado para receber um link de redefinição.</p>
    <label htmlFor="email-recuperacao" className="mt-6 block text-sm font-semibold text-white">E-mail</label>
    <div className="relative mt-2"><input id="email-recuperacao" type="email" value={email} onChange={(evento) => setEmail(evento.target.value)} required autoComplete="email" placeholder="voce@exemplo.com" className="min-h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-10 pr-3 text-white outline-none placeholder:text-ink-500 focus:border-brand-400" /><AtSignIcon size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" /></div>
    {erro && <p role="alert" className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">{erro}</p>}
    <button type="submit" disabled={enviando} className="mt-6 min-h-11 w-full rounded-lg bg-white px-4 font-semibold text-ink-900 transition hover:bg-ink-100 disabled:opacity-50">{enviando ? 'Enviando…' : 'Enviar link'}</button>
  </form>
}
