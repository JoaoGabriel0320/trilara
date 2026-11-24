'use client'

import { useState } from 'react'

const campo = 'mt-1 w-full rounded-lg border border-white/15 bg-white/[0.05] px-3 py-2.5 text-white outline-none focus:border-brand-400'

export function SolicitarAcessoForm() {
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setEnviando(true)
    const dados = new FormData(evento.currentTarget)
    try {
      const resposta = await fetch('/api/solicitar-acesso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(dados), tipoAcesso: 'INTERNO' }),
      })
      const resultado = await resposta.json().catch(() => ({}))
      if (!resposta.ok) setErro(resultado.error ?? 'Não foi possível enviar a solicitação.')
      else setSucesso(true)
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setEnviando(false) }
  }

  if (sucesso) return <div role="status" className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <h1 className="text-xl font-semibold">Solicitação recebida</h1>
    <p className="mt-2 text-sm text-ink-300">Se o e-mail puder solicitar acesso, um administrador analisará o pedido. Após a aprovação, entre com o e-mail e a senha cadastrados.</p>
  </div>

  return <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
    <div><h1 className="text-xl font-semibold">Solicitar acesso</h1><p className="mt-1 text-sm text-ink-400">Crie sua solicitação para usar a Trilara.</p></div>
    <label className="block text-sm">Nome completo<input name="nome" required maxLength={120} autoComplete="name" className={campo} /></label>
    <label className="block text-sm">E-mail<input name="email" type="email" required placeholder="voce@exemplo.com" autoComplete="email" className={campo} /></label>
    <label className="block text-sm">Senha<input name="senha" type="password" required minLength={8} maxLength={72} autoComplete="new-password" className={campo} /></label>
    <p className="text-xs text-ink-400">Sua solicitação ficará pendente até um administrador confirmar sua identidade e aprová-la.</p>
    {erro && <p role="alert" className="text-sm text-rose-300">{erro}</p>}
    <button type="submit" disabled={enviando} className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-ink-900 disabled:opacity-50">{enviando ? 'Enviando…' : 'Enviar solicitação'}</button>
  </form>
}
