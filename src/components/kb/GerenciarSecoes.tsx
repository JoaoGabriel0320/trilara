'use client'

// src/components/kb/GerenciarSecoes.tsx
//
// Mesmo padrão do GerenciarDepartamentos (renomear inline, ativar/desativar,
// excluir com confirmação em modal), adaptado pro que Seção tem de diferente:
// pertence a um sistema (agrupa a lista por sistema, e o formulário de criar
// pede o sistema via Selecao) e excluir não bloqueia por ter documento
// vinculado — eles só voltam pro grupo "Geral" (é o que o texto do modal avisa).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Check, Pencil, X } from 'lucide-react'
import { Selecao } from '@/components/ui/Selecao'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Secao = { id: string; nome: string; sistemaSlug: string; ativo: boolean; totalDocumentos: number }
type AcaoPendente =
  | { tipo: 'editar'; secao: Secao; novoNome: string }
  | { tipo: 'excluir'; secao: Secao }
  | { tipo: 'alternar'; secao: Secao }

export function GerenciarSecoes({
  secoes,
  sistemas,
}: {
  secoes: Secao[]
  sistemas: { slug: string; name: string }[]
}) {
  const router = useRouter()
  const [sistemaSlug, setSistemaSlug] = useState(sistemas[0]?.slug ?? '')
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
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-secao] button:not(:disabled)')
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
    if (!sistemaSlug) { setErro('Selecione o sistema.'); return }
    setOcupado(true)
    try {
      const res = await fetch('/api/admin/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sistemaSlug, nome }),
      })
      const dados = await res.json()
      if (!res.ok) setErro(dados.error ?? 'Não foi possível adicionar a seção.')
      else { setNome(''); router.refresh() }
    } catch { setErro('Falha de conexão.') }
    finally { setOcupado(false) }
  }

  function solicitarEdicao(evento: React.FormEvent, secao: Secao) {
    evento.preventDefault()
    const novoNome = nomeEdicao.trim()
    if (!novoNome || novoNome === secao.nome) { setEditandoId(null); return }
    setErroModal('')
    setAcaoPendente({ tipo: 'editar', secao, novoNome })
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
      const res = await fetch(`/api/admin/categorias/${acao.secao.id}`, acao.tipo === 'excluir'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(acao.tipo === 'editar' ? { nome: acao.novoNome } : { ativo: !acao.secao.ativo }) })
      const dados = await res.json()
      if (!res.ok) { setErroModal(dados.error ?? 'Não foi possível concluir a ação.'); return }
      setAcaoPendente(null)
      if (acao.tipo === 'editar') setEditandoId(null)
      router.refresh()
    } catch { setErroModal('Falha de conexão. Tente novamente.') }
    finally { setOcupado(false) }
  }

  const tituloModal = acaoPendente?.tipo === 'excluir' ? 'Excluir seção?'
    : acaoPendente?.tipo === 'editar' ? 'Salvar alteração?'
      : acaoPendente?.secao.ativo ? 'Desativar seção?' : 'Ativar seção?'
  const rotuloConfirmar = acaoPendente?.tipo === 'excluir' ? 'Excluir seção'
    : acaoPendente?.tipo === 'editar' ? 'Salvar alteração'
      : acaoPendente?.secao.ativo ? 'Desativar' : 'Ativar'

  const nomeSistema = (slug: string) => sistemas.find((s) => s.slug === slug)?.name ?? slug
  const secoesPorSistema = sistemas
    .map((sistema) => ({ sistema, itens: secoes.filter((s) => s.sistemaSlug === sistema.slug) }))
    .filter((grupo) => grupo.itens.length > 0)

  return <div className="space-y-8">
    <form onSubmit={adicionar} className="space-y-3 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
      <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Nova seção</p>
      <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-56">
          <Selecao
            valor={sistemaSlug}
            onChange={setSistemaSlug}
            placeholder="Selecione o sistema"
            buscavel={sistemas.length > 6}
            opcoes={sistemas.map((s) => ({ value: s.slug, label: s.name }))}
          />
        </div>
        <input
          aria-label="Nome da seção"
          placeholder="Ex.: Primeiros passos"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          maxLength={120}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-4 text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
        />
        <button disabled={ocupado || Boolean(acaoPendente)} className="min-h-11 rounded-xl bg-brand-500 px-5 font-semibold text-white disabled:opacity-50">
          Adicionar seção
        </button>
      </div>
    </form>
    {erro && <p role="alert" className="text-sm text-rose-600">{erro}</p>}

    {secoesPorSistema.length === 0 ? (
      <p className="text-sm text-ink-500">Nenhuma seção cadastrada ainda.</p>
    ) : (
      <div className="space-y-6">
        {secoesPorSistema.map((grupo) => (
          <div key={grupo.sistema.slug}>
            <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
              {grupo.sistema.name}
            </h2>
            <div className="space-y-2">
              {grupo.itens.map((secao) => (
                <div key={secao.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-800">
                  {editandoId === secao.id ? (
                    <form onSubmit={(evento) => solicitarEdicao(evento, secao)} className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        aria-label={`Novo nome de ${secao.nome}`}
                        autoFocus
                        required
                        maxLength={120}
                        value={nomeEdicao}
                        onChange={(e) => setNomeEdicao(e.target.value)}
                        className="min-h-11 min-w-0 flex-1 rounded-lg border border-brand-500 bg-white px-3 text-ink-900 dark:bg-ink-900 dark:text-white"
                      />
                      <button type="submit" disabled={ocupado || Boolean(acaoPendente)} title="Salvar nome" aria-label={`Salvar nome de ${secao.nome}`} className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-500/10">
                        <Check size={19} />
                      </button>
                      <button type="button" disabled={ocupado || Boolean(acaoPendente)} onClick={() => setEditandoId(null)} className="text-sm text-ink-500">
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <span className="min-w-0 flex-1 text-ink-900 dark:text-white">
                      {secao.nome}{' '}
                      {!secao.ativo && <small className="text-ink-500">(inativa)</small>}{' '}
                      <small className="text-ink-400">
                        · {secao.totalDocumentos} {secao.totalDocumentos === 1 ? 'documento' : 'documentos'}
                      </small>
                    </span>
                  )}
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={ocupado || editandoId !== null || Boolean(acaoPendente)}
                      onClick={() => solicitarAcao({ tipo: 'alternar', secao })}
                      className="mr-2 rounded-lg px-2 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                    >
                      {secao.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      disabled={ocupado || editandoId !== null || Boolean(acaoPendente)}
                      onClick={() => { setEditandoId(secao.id); setNomeEdicao(secao.nome); setErro('') }}
                      title={`Editar ${secao.nome}`}
                      aria-label={`Editar ${secao.nome}`}
                      className="rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-brand-600 disabled:opacity-50 dark:hover:bg-ink-700"
                    >
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={ocupado || editandoId !== null || Boolean(acaoPendente)}
                      onClick={() => solicitarAcao({ tipo: 'excluir', secao })}
                      title={`Excluir ${secao.nome}`}
                      aria-label={`Excluir ${secao.nome}`}
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )}

    {acaoPendente && createPortal(
      <div className={FUNDO_MODAL_CONFIRMACAO}>
        <div
          data-modal-secao
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="titulo-modal-secao"
          aria-describedby="descricao-modal-secao"
          className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800"
        >
          <h2 id="titulo-modal-secao" className="text-lg font-semibold text-ink-900 dark:text-white">{tituloModal}</h2>
          <p id="descricao-modal-secao" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            {acaoPendente.tipo === 'excluir' ? (
              <>
                Excluir a seção <strong>{acaoPendente.secao.nome}</strong> de {nomeSistema(acaoPendente.secao.sistemaSlug)}?
                {acaoPendente.secao.totalDocumentos > 0 && (
                  <> Os {acaoPendente.secao.totalDocumentos} documento{acaoPendente.secao.totalDocumentos === 1 ? '' : 's'} vinculados
                  não são apagados — voltam para o grupo "Geral".</>
                )}
                {' '}Esta ação não pode ser desfeita.
              </>
            ) : acaoPendente.tipo === 'editar' ? (
              <>Alterar o nome de <strong>{acaoPendente.secao.nome}</strong> para <strong>{acaoPendente.novoNome}</strong>?</>
            ) : (
              <>
                {acaoPendente.secao.ativo ? 'Desativar' : 'Ativar'} a seção <strong>{acaoPendente.secao.nome}</strong>?
                {acaoPendente.secao.ativo && acaoPendente.secao.totalDocumentos > 0 && (
                  <> Ela some do formulário de cadastro, mas os documentos já publicados nela continuam visíveis.</>
                )}
              </>
            )}
          </p>
          {erroModal && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erroModal}</p>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button ref={botaoCancelarRef} type="button" disabled={ocupado} onClick={() => setAcaoPendente(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">
              Cancelar
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={confirmarAcao}
              className={'min-h-11 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-50 ' + (acaoPendente.tipo === 'excluir' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-brand-500 hover:bg-brand-600')}
            >
              {ocupado ? 'Aguarde…' : rotuloConfirmar}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
  </div>
}
