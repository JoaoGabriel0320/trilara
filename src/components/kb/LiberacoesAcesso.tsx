'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Papel = 'COLABORADOR' | 'EDITOR' | 'ADMIN'
type Solicitacao = { id: string; nome: string; email: string; tipoAcesso: 'INTERNO' | 'EXTERNO'; empresaNome: string | null; departamento: string | null; filial: { nome: string } | null; criadaEm: string; status: string }

const papeis: { valor: Papel; titulo: string; descricao: string }[] = [
  { valor: 'COLABORADOR', titulo: 'Colaborador', descricao: 'Consulta os manuais e documentos disponíveis.' },
  { valor: 'EDITOR', titulo: 'Gestor', descricao: 'Cria documentos e edita apenas os próprios, sem acesso à administração.' },
  { valor: 'ADMIN', titulo: 'Administrador', descricao: 'Também gerencia usuários, filiais, departamentos e liberações.' },
]

export function LiberacoesAcesso({ solicitacoes }: { solicitacoes: Solicitacao[] }) {
  const router = useRouter()
  const [selecionada, setSelecionada] = useState<Solicitacao | null>(null)
  const [decisao, setDecisao] = useState<'APROVADA' | 'REPROVADA'>('APROVADA')
  const [papel, setPapel] = useState<Papel>('COLABORADOR')
  const [identidadeConfirmada, setIdentidadeConfirmada] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const cancelarRef = useRef<HTMLButtonElement>(null)
  const enviandoRef = useRef(enviando)

  useBloqueioRolagemConfirmacao(Boolean(selecionada))
  useEffect(() => { enviandoRef.current = enviando }, [enviando])

  useEffect(() => {
    if (!selecionada) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelarRef.current?.focus()
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !enviandoRef.current) setSelecionada(null)
      if (evento.key !== 'Tab') return
      const controles = document.querySelectorAll<HTMLElement>('[data-modal-liberacao] button:not(:disabled), [data-modal-liberacao] input:not(:disabled)')
      if (controles.length < 2) return
      const primeiro = controles[0]
      const ultimo = controles[controles.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [selecionada])

  function abrir(solicitacao: Solicitacao, novaDecisao: 'APROVADA' | 'REPROVADA') {
    setSelecionada(solicitacao)
    setDecisao(novaDecisao)
    setPapel('COLABORADOR')
    setIdentidadeConfirmada(false)
    setErro('')
  }

  async function confirmar() {
    if (!selecionada || enviando || (decisao === 'APROVADA' && !identidadeConfirmada)) return
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch(`/api/admin/solicitacoes/${selecionada.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisao, ...(decisao === 'APROVADA' ? { papel, identidadeConfirmada } : {}) }),
      })
      const dados = await res.json()
      if (!res.ok) setErro(dados.error ?? 'Não foi possível decidir a solicitação.')
      else { setSelecionada(null); router.refresh() }
    } catch { setErro('Falha de conexão. Tente novamente.') }
    finally { setEnviando(false) }
  }

  return <div className="space-y-3">
    {solicitacoes.length === 0 && <p className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-ink-500">Nenhuma solicitação recebida.</p>}
    {solicitacoes.map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-800">
      <div><p className="font-semibold text-ink-900 dark:text-white">{s.nome} <span className="text-sm font-normal text-ink-500">· {s.tipoAcesso === 'EXTERNO' ? 'Externo' : 'Interno'} · {s.status.toLowerCase()}</span></p><p className="text-sm text-ink-500">{s.email} · {s.tipoAcesso === 'EXTERNO' ? s.empresaNome : [s.departamento, s.filial?.nome].filter(Boolean).join(' · ')}</p><p className="text-xs text-ink-400">{new Date(s.criadaEm).toLocaleString('pt-BR')}</p></div>
      {s.status === 'PENDENTE' && <div className="flex gap-2"><button onClick={() => abrir(s, 'REPROVADA')} className="rounded-lg border border-ink-200 px-4 py-2 text-sm text-ink-700 dark:text-ink-200">Reprovar</button><button onClick={() => abrir(s, 'APROVADA')} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white">Aprovar</button></div>}
    </div>)}

    {selecionada && createPortal(<div className={FUNDO_MODAL_CONFIRMACAO}>
      <div data-modal-liberacao role="alertdialog" aria-modal="true" aria-labelledby="titulo-liberacao" className="mobile-modal max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800">
        <div><h2 id="titulo-liberacao" className="text-xl font-semibold text-ink-900 dark:text-white">{decisao === 'APROVADA' ? 'Aprovar acesso' : 'Reprovar acesso'}</h2><p className="mt-1 text-sm text-ink-500">{selecionada.nome} · {selecionada.email}</p></div>
        {decisao === 'APROVADA' && selecionada.tipoAcesso === 'EXTERNO' && <div className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-ink-200"><strong>Cliente ou transportadora · somente leitura</strong><p className="mt-1">Empresa informada: {selecionada.empresaNome}. Confirme o vínculo antes de aprovar. A conta verá apenas a documentação compartilhada com convidados.</p></div>}
        {decisao === 'APROVADA' && selecionada.tipoAcesso === 'INTERNO' ? <fieldset className="mt-6"><legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900 dark:text-white"><ShieldCheck size={18} className="text-brand-500" />Nível de acesso</legend><div className="space-y-2">{papeis.map((opcao) => <label key={opcao.valor} className="block cursor-pointer"><input type="radio" name="papelSolicitacao" value={opcao.valor} checked={papel === opcao.valor} onChange={() => setPapel(opcao.valor)} className="peer sr-only" /><span className="flex items-start gap-3 rounded-xl border border-ink-200 p-4 transition hover:border-brand-300 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 dark:border-ink-700 dark:peer-checked:bg-brand-500/10"><span aria-hidden="true" className={'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ' + (papel === opcao.valor ? 'border-brand-500 bg-brand-500' : 'border-ink-300 dark:border-ink-600')}>{papel === opcao.valor && <span className="h-2 w-2 rounded-full bg-white" />}</span><span><strong className="block text-sm text-ink-900 dark:text-white">{opcao.titulo}</strong><span className="mt-1 block text-xs leading-relaxed text-ink-500">{opcao.descricao}</span></span></span></label>)}</div></fieldset> : decisao === 'REPROVADA' ? <p className="mt-6 text-sm text-ink-600 dark:text-ink-300">A solicitação será reprovada e nenhuma conta será criada.</p> : null}
        {decisao === 'APROVADA' && <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-ink-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-ink-200"><input type="checkbox" checked={identidadeConfirmada} onChange={(evento) => setIdentidadeConfirmada(evento.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" /><span>Confirmei a identidade desta pessoa{selecionada.tipoAcesso === 'EXTERNO' ? ' e seu vínculo com a empresa informada' : ''} por um canal confiável antes de liberar o acesso. O endereço de e-mail ainda não foi verificado automaticamente.</span></label>}
        {erro && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erro}</p>}
        <div className="mt-6 flex justify-end gap-3"><button ref={cancelarRef} type="button" disabled={enviando} onClick={() => setSelecionada(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 dark:border-ink-700 dark:text-ink-200">Cancelar</button><button type="button" disabled={enviando || (decisao === 'APROVADA' && !identidadeConfirmada)} onClick={confirmar} className={'min-h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50 ' + (decisao === 'APROVADA' ? 'bg-brand-500 hover:bg-brand-600' : 'bg-rose-600 hover:bg-rose-700')}>{enviando ? 'Aguarde…' : decisao === 'APROVADA' ? 'Confirmar aprovação' : 'Confirmar reprovação'}</button></div>
      </div>
    </div>, document.body)}
  </div>
}
