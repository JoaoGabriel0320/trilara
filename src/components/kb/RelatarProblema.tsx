'use client'

import { useState } from 'react'
import { Flag, X } from 'lucide-react'

export function RelatarProblema({ documentoId, compacto = false, passo }: {
  documentoId: string
  compacto?: boolean
  passo?: { numero: number; titulo: string }
}) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const sufixo = passo ? `passo-${passo.numero}` : 'geral'
  const idCampo = `relato-documento-${documentoId}-${sufixo}`

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const resposta = await fetch(`/api/documentos/${encodeURIComponent(documentoId)}/relatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem, ...(passo ? { passo: passo.numero, tituloPasso: passo.titulo } : {}) }),
      })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.error ?? 'Não foi possível enviar o relato.')
      setSucesso(true)
      setAberto(false)
      setMensagem('')
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar o relato.')
    } finally {
      setEnviando(false)
    }
  }

  const classeRaiz = passo
    ? 'min-w-0'
    : compacto
      ? 'border-t border-ink-200 px-4 pb-4 dark:border-ink-800'
      : 'rounded-2xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800 sm:p-6'

  return <section className={classeRaiz}>
    {!compacto && !passo && <div className="flex items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Flag size={20} aria-hidden="true" /></span>
      <div><h2 className="text-[16px] font-semibold text-ink-900 dark:text-ink-50">Encontrou algum problema?</h2><p className="mt-1 text-[13px] text-ink-500 dark:text-ink-400">Avise a equipe de TI sobre este documento.</p></div>
    </div>}
    {sucesso && <p role="status" className="mt-2 rounded-xl bg-emerald-50 p-3 text-[13px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">Relato enviado para a TI. Obrigado por avisar.</p>}
    {!aberto ? <button
      type="button"
      onClick={() => { setAberto(true); setSucesso(false) }}
      className={passo ? 'min-h-10 text-[12px] font-semibold text-brand-600 hover:underline dark:text-brand-400' : compacto ? 'mt-2 text-[12px] font-medium text-brand-600 hover:underline dark:text-brand-400' : 'mt-4 min-h-11 rounded-xl border border-ink-200 px-4 text-[13px] font-medium text-brand-600 hover:border-brand-400 dark:border-ink-700 dark:text-brand-400'}
    >{passo ? 'Relatar problema neste passo' : 'Reportar problema'}</button> : <form onSubmit={enviar} className="mt-3 min-w-[min(100%,22rem)] space-y-3">
      <label htmlFor={idCampo} className="block text-[13px] font-medium text-ink-700 dark:text-ink-200">{passo ? `O que precisa ser corrigido no passo ${passo.numero}?` : 'O que precisa ser corrigido?'}</label>
      <textarea id={idCampo} value={mensagem} onChange={(evento) => setMensagem(evento.target.value)} required minLength={10} maxLength={1500} rows={4} placeholder={passo ? 'Ex.: A tela deste passo mudou...' : 'Ex.: O passo 3 mostra uma tela antiga...'} className="w-full rounded-xl border border-ink-200 bg-ink-50 p-3 text-[14px] text-ink-900 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50" />
      {erro && <p role="alert" className="text-[13px] text-rose-600 dark:text-rose-400">{erro}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={enviando || mensagem.trim().length < 10} className="min-h-11 rounded-xl bg-brand-500 px-4 text-[13px] font-semibold text-white disabled:opacity-50">{enviando ? 'Enviando…' : 'Enviar para a TI'}</button>
        <button type="button" disabled={enviando} onClick={() => { setAberto(false); setErro(null) }} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-[13px] text-ink-500"><X size={15} aria-hidden="true" /> Cancelar</button>
      </div>
    </form>}
  </section>
}
