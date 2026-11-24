'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { SenhaTemporaria } from './SenhaTemporaria'
import { INTERVALO_PRESENCA_MS } from '@/lib/presenca'
import { AvatarColaborador } from '@/components/portal/AvatarColaborador'
import { Selecao } from '@/components/ui/Selecao'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Papel = 'COLABORADOR' | 'EDITOR' | 'ADMIN'
type FiltroStatus = 'todos' | 'ativos' | 'inativos'
const SEM_FILIAL = '__sem_filial__'

type Usuario = {
  id: string
  nome: string
  email: string
  fotoKey: string | null
  departamento: string | null
  filialNome: string | null
  tipoAcesso: 'INTERNO' | 'EXTERNO'
  empresaNome: string | null
  papel: Papel
  ativo: boolean
  adminProtegido: boolean
  mustChangePassword: boolean
  ultimoLoginEm: string | null
  online: boolean
  criadoEm: string
}

const ROTULO_PAPEL: Record<Papel, string> = {
  COLABORADOR: 'Colaborador',
  EDITOR: 'Gestor',
  ADMIN: 'Administrador',
}

const COR_PAPEL: Record<Papel, string> = {
  COLABORADOR: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  EDITOR: 'bg-blue-50 text-blue-700 dark:bg-blue-900/25 dark:text-blue-300',
  ADMIN: 'bg-brand-50 text-brand-700 dark:bg-brand-900/25 dark:text-brand-300',
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function formatarData(iso: string | null) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function TabelaUsuarios({ usuarios, filiais, usuarioAtualId }: { usuarios: Usuario[]; filiais: string[]; usuarioAtualId: string }) {
  const router = useRouter()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [filial, setFilial] = useState('')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [senhaRevelada, setSenhaRevelada] = useState<{ senha: string; nome: string } | null>(null)
  const [usuarioParaResetar, setUsuarioParaResetar] = useState<Usuario | null>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set(usuarios.filter((u) => u.online).map((u) => u.id)))
  const cancelarResetRef = useRef<HTMLButtonElement>(null)
  const ocupadoRef = useRef(ocupado)

  useEffect(() => { ocupadoRef.current = ocupado }, [ocupado])

  useEffect(() => {
    let ativo = true
    async function atualizarPresenca() {
      if (document.visibilityState !== 'visible') return
      try {
        const resposta = await fetch('/api/admin/usuarios/presenca', { cache: 'no-store' })
        if (!resposta.ok) return
        const dados: { ids: string[] } = await resposta.json()
        if (ativo) setOnlineIds(new Set(dados.ids))
      } catch {
        // Conserva o último estado recebido até a próxima consulta.
      }
    }

    void atualizarPresenca()
    const intervalo = window.setInterval(() => void atualizarPresenca(), INTERVALO_PRESENCA_MS / 2)
    document.addEventListener('visibilitychange', atualizarPresenca)
    return () => {
      ativo = false
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', atualizarPresenca)
    }
  }, [])

  useBloqueioRolagemConfirmacao(Boolean(usuarioParaResetar))

  useEffect(() => {
    if (!usuarioParaResetar) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelarResetRef.current?.focus()
    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !ocupadoRef.current) setUsuarioParaResetar(null)
      if (evento.key !== 'Tab') return
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-reset-senha] button:not(:disabled)')
      if (botoes.length < 2) return
      const primeiro = botoes[0]
      const ultimo = botoes[botoes.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [usuarioParaResetar])

  const opcoesFilial = useMemo(() => {
    const nomesUsuarios = usuarios.map((u) => u.filialNome?.trim()).filter((nome): nome is string => Boolean(nome))
    const nomes = [...new Set([...filiais, ...nomesUsuarios])]
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return [
      { value: '', label: 'Todas as filiais' },
      ...nomes.map((nome) => ({ value: nome, label: nome })),
      ...(usuarios.some((u) => !u.filialNome?.trim()) ? [{ value: SEM_FILIAL, label: 'Sem filial' }] : []),
    ]
  }, [filiais, usuarios])

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return usuarios.filter((u) => {
      if (status === 'ativos' && !u.ativo) return false
      if (status === 'inativos' && u.ativo) return false
      if (filial === SEM_FILIAL ? Boolean(u.filialNome?.trim()) : filial !== '' && u.filialNome?.trim() !== filial) return false
      return !termo || normalizar(`${u.nome} ${u.email} ${u.departamento ?? ''} ${u.empresaNome ?? ''} ${u.tipoAcesso}`).includes(termo)
    })
  }, [busca, filial, status, usuarios])

  const filtrando = busca.trim() !== '' || status !== 'todos' || filial !== ''

  async function alternarAtivo(u: Usuario) {
    setOcupado(u.id)
    setErro(null)
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    if (!res.ok) {
      const dados = await res.json().catch(() => ({}))
      setErro(dados.error ?? 'Não foi possível alterar o status.')
    } else {
      router.refresh()
    }
    setOcupado(null)
  }

  async function resetarSenha(u: Usuario) {
    setOcupado(u.id)
    setErroModal(null)
    try {
      const res = await fetch(`/api/admin/usuarios/${u.id}/resetar-senha`, { method: 'POST' })
      const dados = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErroModal(dados.error ?? 'Não foi possível resetar a senha.')
      } else {
        setUsuarioParaResetar(null)
        setSenhaRevelada({ senha: dados.senhaTemporaria, nome: u.nome })
        router.refresh()
      }
    } catch {
      setErroModal('Falha de conexão. Tente novamente.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div>
      {senhaRevelada && (
        <SenhaTemporaria
          senha={senhaRevelada.senha}
          nomeColaborador={senhaRevelada.nome}
          onFechar={() => setSenhaRevelada(null)}
        />
      )}

      {usuarioParaResetar && createPortal(
        <div className={FUNDO_MODAL_CONFIRMACAO}>
          <div data-modal-reset-senha role="alertdialog" aria-modal="true" aria-labelledby="titulo-reset-senha" aria-describedby="descricao-reset-senha" className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800">
            <h2 id="titulo-reset-senha" className="text-lg font-semibold text-ink-900 dark:text-white">Resetar senha?</h2>
            <p id="descricao-reset-senha" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Gerar uma nova senha temporária para <strong>{usuarioParaResetar.nome}</strong>? A senha atual deixará de funcionar. A nova senha aparecerá uma única vez após a confirmação.
            </p>
            {erroModal && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erroModal}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button ref={cancelarResetRef} type="button" disabled={ocupado === usuarioParaResetar.id} onClick={() => setUsuarioParaResetar(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">Cancelar</button>
              <button type="button" disabled={ocupado === usuarioParaResetar.id} onClick={() => resetarSenha(usuarioParaResetar)} className="min-h-11 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">{ocupado === usuarioParaResetar.id ? 'Gerando…' : 'Gerar senha temporária'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="relative block w-full sm:max-w-[380px] sm:flex-1">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, e-mail ou departamento…"
            aria-label="Buscar colaboradores"
            className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pl-10 pr-3.5 text-[14px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-800/60 dark:text-ink-50"
          />
        </label>

        <div className="-mt-1.5 w-full sm:w-64">
          <span id="filtro-filial-usuarios" className="sr-only">Filtrar colaboradores por filial</span>
          <Selecao
            rotuloId="filtro-filial-usuarios"
            valor={filial}
            onChange={setFilial}
            opcoes={opcoesFilial}
            buscavel={opcoesFilial.length > 7}
          />
        </div>

        <div role="group" aria-label="Filtrar colaboradores por status" className="flex min-h-12 w-full sm:w-auto shrink-0 rounded-xl bg-ink-100 p-1 dark:bg-ink-900">
          {([
            ['todos', 'Todos'],
            ['ativos', 'Ativos'],
            ['inativos', 'Inativos'],
          ] as const).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setStatus(valor)}
              aria-pressed={status === valor}
              className={'flex-1 rounded-lg px-3.5 text-[13.5px] font-medium transition ' + (
                status === valor
                  ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-ink-50'
                  : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {erro}
        </p>
      )}

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-200 px-6 py-10 text-center text-[14px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
          <p>Nenhum colaborador encontrado com os filtros selecionados.</p>
          {filtrando && <button type="button" onClick={() => { setBusca(''); setFilial(''); setStatus('todos') }} className="mt-3 font-medium text-brand-600 hover:underline dark:text-brand-400">Limpar filtros</button>}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-800/40">
          <div className="hidden items-center gap-4 border-b border-ink-200 bg-ink-50 px-5 py-3 text-xs font-semibold text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400 sm:flex">
            <span className="min-w-0 flex-1">Colaborador</span>
            <span className="w-32 shrink-0">Permissões</span>
            <span className="w-[220px] shrink-0 text-right">Ações</span>
          </div>
          <ul className="divide-y divide-ink-200 dark:divide-ink-800">
          {filtrados.map((u) => (
            <li key={u.id} className="mobile-user-row flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
              <AvatarColaborador
                nome={u.nome}
                fotoKey={u.fotoKey}
                urlFoto={`/api/admin/usuarios/${encodeURIComponent(u.id)}/foto`}
                className="h-9 w-9 rounded-full text-[11px]"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[14.5px] font-medium text-ink-900 dark:text-ink-50">{u.nome}</p>
                  {u.ativo && onlineIds.has(u.id) && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                      Online
                    </span>
                  )}
                  {!u.ativo && (
                    <span className="rotulo shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                      inativo
                    </span>
                  )}
                  {u.mustChangePassword && u.ativo && (
                    <span className="rotulo shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      senha temporária
                    </span>
                  )}
                </div>
                <p className="rotulo mt-1 truncate text-ink-400">
                  {[u.tipoAcesso === 'EXTERNO' ? 'Cliente / transportadora' : 'Interno', u.empresaNome, u.departamento, u.filialNome, `último acesso ${formatarData(u.ultimoLoginEm)}`].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="flex w-full shrink-0 items-center gap-2 sm:w-32 sm:justify-start" aria-label={`Permissões: ${ROTULO_PAPEL[u.papel]}`}>
                <span className="text-xs font-medium text-ink-500 dark:text-ink-400 sm:hidden">Permissões</span>
                <span className={`rotulo rounded-full px-2 py-0.5 ${COR_PAPEL[u.papel]}`}>{ROTULO_PAPEL[u.papel]}</span>
              </div>

              <div className="mobile-user-actions flex shrink-0 items-center gap-3 text-[13px] sm:min-w-[220px] sm:justify-end">
                {(!u.adminProtegido || u.id === usuarioAtualId) && (
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
                  >
                    Editar
                  </Link>
                )}
                {!u.adminProtegido && (
                  <>
                    <button
                      onClick={() => { setErroModal(null); setUsuarioParaResetar(u) }}
                      disabled={ocupado === u.id}
                      className="font-medium text-ink-500 hover:text-brand-600 disabled:opacity-50 dark:text-ink-400 dark:hover:text-brand-400"
                    >
                      Resetar senha
                    </button>
                    <button
                      onClick={() => alternarAtivo(u)}
                      disabled={ocupado === u.id}
                      className={
                        'font-medium disabled:opacity-50 ' +
                        (u.ativo
                          ? 'text-rose-600 hover:underline dark:text-rose-400'
                          : 'text-emerald-600 hover:underline dark:text-emerald-400')
                      }
                    >
                      {u.ativo ? 'Desativar' : 'Reativar'}
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
          </ul>
        </div>
      )}
    </div>
  )
}
