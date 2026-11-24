'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, Pencil, X } from 'lucide-react'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Departamento = { id: string; nome: string; ativo: boolean }
type AcaoPendente =
  | { tipo: 'editar'; departamento: Departamento; novoNome: string }
  | { tipo: 'excluir'; departamento: Departamento }
  | { tipo: 'alternar'; departamento: Departamento }

export function GerenciarDepartamentos({ departamentos }: { departamentos: Departamento[] }) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nomeEdicao, setNomeEdicao] = useState('')
  const [acaoPendente, setAcaoPendente] = useState<AcaoPendente | null>(null)
  const [erroModal, setErroModal] = useState('')
  const botaoCancelarRef = useRef<HTMLButtonElement>(null)
  const ocupadoRef = useRef(ocupado)

  useBloqueioRolagemConfirmacao(Boolean(acaoPendente))
  useEffect(() => { ocupadoRef.current = ocupado }, [ocupado])

  useEffect(() => {
    if (!acaoPendente) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    botaoCancelarRef.current?.focus()
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !ocupadoRef.current) setAcaoPendente(null)
      if (evento.key !== 'Tab') return
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-departamento] button:not(:disabled)')
      if (botoes.length < 2) return
      const primeiro = botoes[0]
      const ultimo = botoes[botoes.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [acaoPendente])

  async function adicionar(evento: React.FormEvent) {
    evento.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      const res = await fetch('/api/admin/departamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) })
      const dados = await res.json()
      if (!res.ok) setErro(dados.error ?? 'Não foi possível adicionar o departamento.')
      else { setNome(''); router.refresh() }
    } catch { setErro('Falha de conexão.') }
    finally { setOcupado(false) }
  }

  function solicitarEdicao(evento: React.FormEvent, departamento: Departamento) {
    evento.preventDefault()
    const novoNome = nomeEdicao.trim()
    if (!novoNome || novoNome === departamento.nome) { setEditandoId(null); return }
    setErroModal('')
    setAcaoPendente({ tipo: 'editar', departamento, novoNome })
  }

  function solicitarAcao(acao: AcaoPendente) {
    setErroModal('')
    setAcaoPendente(acao)
  }

  async function confirmarAcao() {
    if (!acaoPendente || ocupado) return
    const acao = acaoPendente
    setErroModal('')
    setOcupado(true)
    try {
      const res = await fetch(`/api/admin/departamentos/${acao.departamento.id}`, acao.tipo === 'excluir'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(acao.tipo === 'editar' ? { nome: acao.novoNome } : { ativo: !acao.departamento.ativo }) })
      const dados = await res.json()
      if (!res.ok) { setErroModal(dados.error ?? 'Não foi possível concluir a ação.'); return }
      setAcaoPendente(null)
      if (acao.tipo === 'editar') setEditandoId(null)
      router.refresh()
    } catch { setErroModal('Falha de conexão. Tente novamente.') }
    finally { setOcupado(false) }
  }

  const tituloModal = acaoPendente?.tipo === 'excluir' ? 'Excluir departamento?'
    : acaoPendente?.tipo === 'editar' ? 'Salvar alteração?'
      : acaoPendente?.departamento.ativo ? 'Desativar departamento?' : 'Ativar departamento?'
  const rotuloConfirmar = acaoPendente?.tipo === 'excluir' ? 'Excluir departamento'
    : acaoPendente?.tipo === 'editar' ? 'Salvar alteração'
      : acaoPendente?.departamento.ativo ? 'Desativar' : 'Ativar'

  return <div className="space-y-6">
    <form onSubmit={adicionar} className="flex flex-wrap gap-3">
      <input aria-label="Nome do departamento" placeholder="Nome do departamento" value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={120} className="min-h-11 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-ink-900 dark:border-ink-700 dark:bg-ink-800 dark:text-white" />
      <button disabled={ocupado || Boolean(acaoPendente)} className="rounded-xl bg-brand-500 px-5 font-semibold text-white disabled:opacity-50">Adicionar departamento</button>
    </form>
    {erro && <p role="alert" className="text-sm text-rose-600">{erro}</p>}
    <div className="space-y-2">{departamentos.map((departamento) => <div key={departamento.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
      {editandoId === departamento.id ? <form onSubmit={(evento) => solicitarEdicao(evento, departamento)} className="flex min-w-0 flex-1 items-center gap-2">
        <input aria-label={`Novo nome de ${departamento.nome}`} autoFocus required maxLength={120} value={nomeEdicao} onChange={(e) => setNomeEdicao(e.target.value)} className="min-h-11 min-w-0 flex-1 rounded-lg border border-brand-500 bg-white px-3 text-ink-900 dark:bg-ink-900 dark:text-white" />
        <button type="submit" disabled={ocupado || Boolean(acaoPendente)} title="Salvar nome" aria-label={`Salvar nome de ${departamento.nome}`} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 disabled:opacity-50"><Check size={19} /></button>
        <button type="button" disabled={ocupado || Boolean(acaoPendente)} onClick={() => setEditandoId(null)} className="text-sm text-ink-500">Cancelar</button>
      </form> : <span className="min-w-0 flex-1 text-ink-900 dark:text-white">{departamento.nome} {!departamento.ativo && <small className="text-ink-500">(inativo)</small>}</span>}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button type="button" disabled={ocupado || editandoId !== null || Boolean(acaoPendente)} onClick={() => solicitarAcao({ tipo: 'alternar', departamento })} className="mr-2 rounded-lg px-2 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-500/10">{departamento.ativo ? 'Desativar' : 'Ativar'}</button>
        <button type="button" disabled={ocupado || editandoId !== null || Boolean(acaoPendente)} onClick={() => { setEditandoId(departamento.id); setNomeEdicao(departamento.nome); setErro('') }} title={`Editar ${departamento.nome}`} aria-label={`Editar ${departamento.nome}`} className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-700"><Pencil size={18} aria-hidden="true" /></button>
        <button type="button" disabled={ocupado || editandoId !== null || Boolean(acaoPendente)} onClick={() => solicitarAcao({ tipo: 'excluir', departamento })} title={`Excluir ${departamento.nome}`} aria-label={`Excluir ${departamento.nome}`} className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><X size={20} aria-hidden="true" /></button>
      </div>
    </div>)}</div>
    {departamentos.length === 0 && <p className="text-sm text-ink-500">Nenhum departamento cadastrado.</p>}

    {acaoPendente && createPortal(<div className={FUNDO_MODAL_CONFIRMACAO}>
      <div data-modal-departamento role="alertdialog" aria-modal="true" aria-labelledby="titulo-modal-departamento" aria-describedby="descricao-modal-departamento" className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800">
        <h2 id="titulo-modal-departamento" className="text-lg font-semibold text-ink-900 dark:text-white">{tituloModal}</h2>
        <p id="descricao-modal-departamento" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          {acaoPendente.tipo === 'excluir' ? <>Excluir o departamento <strong>{acaoPendente.departamento.nome}</strong>? Esta ação não pode ser desfeita.</>
            : acaoPendente.tipo === 'editar' ? <>Alterar o nome de <strong>{acaoPendente.departamento.nome}</strong> para <strong>{acaoPendente.novoNome}</strong>? Colaboradores e solicitações vinculados também serão atualizados.</>
              : <>{acaoPendente.departamento.ativo ? 'Desativar' : 'Ativar'} o departamento <strong>{acaoPendente.departamento.nome}</strong>?</>}
        </p>
        {erroModal && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erroModal}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={botaoCancelarRef} type="button" disabled={ocupado} onClick={() => setAcaoPendente(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">Cancelar</button>
          <button type="button" disabled={ocupado} onClick={confirmarAcao} className={'min-h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50 ' + (acaoPendente.tipo === 'excluir' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-500 hover:bg-brand-600')}>{ocupado ? 'Aguarde…' : rotuloConfirmar}</button>
        </div>
      </div>
    </div>, document.body)}
  </div>
}
