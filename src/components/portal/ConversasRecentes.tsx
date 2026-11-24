'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Conversa = { id: string; titulo: string; sistemaSlug: string | null; atualizadaEm: string }

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo',
})

export function ConversasRecentes({
  conversas, sistemas, selecionadaId,
}: {
  conversas: Conversa[]
  sistemas: { slug: string; nome: string }[]
  selecionadaId: string | null
}) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [conversaParaExcluir, setConversaParaExcluir] = useState<Conversa | null>(null)
  const [erroModal, setErroModal] = useState('')
  const botaoCancelarRef = useRef<HTMLButtonElement>(null)
  const excluindoRef = useRef(excluindoId)

  useBloqueioRolagemConfirmacao(Boolean(conversaParaExcluir))
  useEffect(() => { excluindoRef.current = excluindoId }, [excluindoId])

  useEffect(() => {
    if (!conversaParaExcluir) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    botaoCancelarRef.current?.focus()
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !excluindoRef.current) setConversaParaExcluir(null)
      if (evento.key !== 'Tab') return
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-conversa] button:not(:disabled)')
      if (botoes.length < 2) return
      const primeiro = botoes[0]
      const ultimo = botoes[botoes.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [conversaParaExcluir])

  async function excluir() {
    if (!conversaParaExcluir || excluindoId) return
    const id = conversaParaExcluir.id
    setErroModal('')
    setExcluindoId(id)
    try {
      const resposta = await fetch(`/api/assistente/conversas/${id}`, { method: 'DELETE' })
      if (!resposta.ok) throw new Error('Não foi possível excluir a conversa. Tente novamente.')
      setConversaParaExcluir(null)
      if (selecionadaId === id) router.replace('/assistente')
      else router.refresh()
    } catch (falha) {
      setErroModal(falha instanceof Error ? falha.message : 'Não foi possível excluir a conversa.')
    } finally {
      setExcluindoId(null)
    }
  }

  return <><aside aria-label="Suas conversas" className="rounded-2xl border border-ink-200 bg-white shadow-sm dark:border-ink-700 dark:bg-ink-800 lg:sticky lg:top-5">
    <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-4 dark:border-ink-700">
      <div>
        <h2 className="text-sm font-semibold text-ink-900 dark:text-ink-50">Suas conversas</h2>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">Privadas · disponíveis por 90 dias</p>
      </div>
      <button type="button" aria-expanded={aberto} aria-controls="lista-conversas-assistente" onClick={() => setAberto((valor) => !valor)} className="flex items-center gap-1 rounded-lg border border-ink-200 px-2.5 py-2 text-xs text-ink-600 dark:border-ink-700 dark:text-ink-300 lg:hidden">
        {aberto ? 'Ocultar' : 'Mostrar'} <ChevronDown size={15} className={aberto ? 'rotate-180' : ''} aria-hidden="true" />
      </button>
    </div>
    <div id="lista-conversas-assistente" className={`${aberto ? 'block' : 'hidden'} p-3 lg:block`}>
      <Link href="/assistente" className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700">
        <Plus size={16} aria-hidden="true" /> Nova conversa
      </Link>
      {conversas.length === 0
        ? <p className="mt-4 px-1 text-sm text-ink-500 dark:text-ink-400">Suas conversas aparecerão aqui.</p>
        : <ul className="mt-3 max-h-[min(65dvh,640px)] space-y-1 overflow-y-auto">{conversas.map((conversa) => {
          const nomeSistema = conversa.sistemaSlug
            ? sistemas.find((item) => item.slug === conversa.sistemaSlug)?.nome ?? 'Sistema removido'
            : 'Todos os sistemas'
          return <li key={conversa.id} className={`group flex items-start gap-1 rounded-xl transition ${selecionadaId === conversa.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-ink-50 dark:hover:bg-ink-700/50'}`}>
            <Link href={`/assistente?conversa=${conversa.id}`} aria-current={selecionadaId === conversa.id ? 'page' : undefined} className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2.5 py-3">
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-brand-600 dark:text-brand-300" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block line-clamp-2 text-sm font-medium leading-snug text-ink-900 dark:text-ink-50">{conversa.titulo}</span>
                <span className="mt-1 block text-[11px] text-ink-500 dark:text-ink-400">{nomeSistema}</span>
                <span className="mt-0.5 block text-[11px] text-ink-400">{dataHora.format(new Date(conversa.atualizadaEm))}</span>
              </span>
            </Link>
            <button type="button" disabled={excluindoId === conversa.id} onClick={() => { setErroModal(''); setConversaParaExcluir(conversa) }} aria-label={`Excluir conversa: ${conversa.titulo}`} title="Excluir conversa" className="mr-1 mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </li>
        })}</ul>}
    </div>
  </aside>
    {conversaParaExcluir && createPortal(
      <div className={FUNDO_MODAL_CONFIRMACAO}>
        <div
          data-modal-conversa
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-conversa"
          aria-describedby="descricao-modal-conversa"
          className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800"
        >
          <h2 id="titulo-modal-conversa" className="text-lg font-semibold text-ink-900 dark:text-white">Excluir conversa?</h2>
          <p id="descricao-modal-conversa" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Excluir a conversa <strong>{conversaParaExcluir.titulo}</strong> e todas as perguntas dela? Esta ação não pode ser desfeita.
          </p>
          {erroModal && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erroModal}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button ref={botaoCancelarRef} type="button" disabled={Boolean(excluindoId)} onClick={() => setConversaParaExcluir(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">
              Cancelar
            </button>
            <button type="button" disabled={Boolean(excluindoId)} onClick={() => void excluir()} className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
              {excluindoId ? 'Aguarde…' : 'Excluir conversa'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
}
