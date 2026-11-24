'use client'

// src/components/kb/TabelaDocumentos.tsx
//
// Tabela da gestão de documentos: busca, filtro por sistema e status, e as
// ações de cada linha. Em telas estreitas as colunas secundárias somem e o
// sistema passa a aparecer embaixo do título.

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Eye, EyeOff, FileText, Film, Link2, ListOrdered, NotebookText, Pencil, Search, Trash2 } from 'lucide-react'
import { Selecao } from '@/components/ui/Selecao'
import { cn } from '@/lib/utils'
import { FUNDO_MODAL_CONFIRMACAO, useBloqueioRolagemConfirmacao } from '@/lib/modal-confirmacao'

type Tipo = 'PDF' | 'ARTIGO' | 'PASSO_A_PASSO' | 'LINK' | 'GIF'

type Linha = {
  id: string
  titulo: string
  slug: string
  sistemaSlug: string
  sistemaNome: string
  categoriaNome: string | null
  publico: 'INTERNO' | 'EXTERNO'
  tipo: Tipo
  ativo: boolean
  visualizacoes: number
  autorNome: string
  criadoEm: string
  atualizadoEm: string // já formatada no servidor
}

type FiltroStatus = 'todos' | 'publicados' | 'rascunhos'

const TIPO: Record<Tipo, { rotulo: string; Icone: typeof FileText }> = {
  PDF: { rotulo: 'PDF', Icone: FileText },
  ARTIGO: { rotulo: 'Página', Icone: NotebookText },
  PASSO_A_PASSO: { rotulo: 'Passo a passo', Icone: ListOrdered },
  LINK: { rotulo: 'Link', Icone: Link2 },
  GIF: { rotulo: 'GIF', Icone: Film },
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function BotaoIcone({
  rotulo,
  perigo,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { rotulo: string; perigo?: boolean }) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      className={cn(
        'grid size-11 md:size-9 place-items-center rounded-lg text-ink-500 transition disabled:opacity-40 dark:text-ink-400',
        perigo
          ? 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
          : 'hover:bg-ink-100 hover:text-ink-900 dark:hover:bg-ink-700/60 dark:hover:text-ink-50'
      )}
      {...props}
    />
  )
}

export function TabelaDocumentos({ documentos, sistemasDisponiveis = [], administrador = true, destinoEdicao = "/admin/documentos" }: { documentos: Linha[]; sistemasDisponiveis?: { slug: string; nome: string }[]; administrador?: boolean; destinoEdicao?: string }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [documentoExcluir, setDocumentoExcluir] = useState<Linha | null>(null)
  const [erroModal, setErroModal] = useState<string | null>(null)
  const botaoCancelarRef = useRef<HTMLButtonElement>(null)
  const ocupadoRef = useRef(false)
  const [busca, setBusca] = useState('')
  const [sistema, setSistema] = useState('')
  const [publico, setPublico] = useState('')
  const [status, setStatus] = useState<FiltroStatus>('todos')

  useBloqueioRolagemConfirmacao(Boolean(documentoExcluir))

  useEffect(() => { ocupadoRef.current = Boolean(ocupado) }, [ocupado])

  useEffect(() => {
    if (!documentoExcluir) return
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    botaoCancelarRef.current?.focus()

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === 'Escape' && !ocupadoRef.current) setDocumentoExcluir(null)
      if (evento.key !== 'Tab') return
      const botoes = document.querySelectorAll<HTMLButtonElement>('[data-modal-documento] button:not(:disabled)')
      if (botoes.length < 2) return
      const primeiro = botoes[0]
      const ultimo = botoes[botoes.length - 1]
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro.focus() }
    }

    document.addEventListener('keydown', aoPressionarTecla)
    return () => { document.removeEventListener('keydown', aoPressionarTecla); focoAnterior?.focus() }
  }, [documentoExcluir])

  const opcoesSistema = useMemo(() => {
    const vistos = new Map(sistemasDisponiveis.map((s) => [s.slug, s.nome]))
    const contagem = new Map<string, number>()
    for (const d of documentos) {
      if (!vistos.has(d.sistemaSlug)) vistos.set(d.sistemaSlug, d.sistemaNome)
      contagem.set(d.sistemaSlug, (contagem.get(d.sistemaSlug) ?? 0) + 1)
    }
    return [
      { value: '', label: 'Todos os sistemas' },
      ...[...vistos].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([value, nome]) => ({
        value,
        label: contagem.has(value) ? nome : `${nome} · sem documentos`,
      })),
    ]
  }, [documentos, sistemasDisponiveis])

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return documentos.filter((d) => {
      if (publico && d.publico !== publico) return false
      if (sistema && d.sistemaSlug !== sistema) return false
      if (status === 'publicados' && !d.ativo) return false
      if (status === 'rascunhos' && d.ativo) return false
      if (termo && !normalizar(`${d.titulo} ${d.categoriaNome ?? ''} ${d.sistemaNome}`).includes(termo)) return false
      return true
    })
  }, [documentos, busca, sistema, status, publico])

  async function alternarPublicacao(linha: Linha) {
    setOcupado(linha.id)
    setErro(null)
    const form = new FormData()
    form.set('ativo', String(!linha.ativo))
    const res = await fetch(`/api/admin/documentos/${linha.id}`, { method: 'PATCH', body: form })
    if (!res.ok) {
      const dados = await res.json().catch(() => ({}))
      setErro(dados.error ?? 'Não foi possível alterar a publicação.')
    } else {
      router.refresh()
    }
    setOcupado(null)
  }

  async function excluir() {
    if (!documentoExcluir || ocupado) return
    const linha = documentoExcluir
    setOcupado(linha.id)
    setErroModal(null)
    try {
      const res = await fetch(`/api/admin/documentos/${linha.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const dados = await res.json().catch(() => ({}))
        setErroModal(dados.error ?? 'Não foi possível excluir.')
        return
      }
      setDocumentoExcluir(null)
      router.refresh()
    } catch {
      setErroModal('Falha de conexão. Tente novamente.')
    } finally {
      setOcupado(null)
    }
  }

  const filtrando = publico !== '' || busca.trim() !== '' || sistema !== '' || status !== 'todos'

  return (
    <div className="rounded-xl border border-ink-200 bg-white shadow-sm dark:border-ink-800 dark:bg-ink-800/40">
      {/* Barra de ferramentas */}
      <div className="flex flex-col gap-3 border-b border-ink-200 p-4 dark:border-ink-800 md:flex-row md:items-center">
        <div className="-mt-1.5 md:w-56">
          <span id="filtro-publico" className="sr-only">Público dos documentos</span>
          <Selecao
            rotuloId="filtro-publico"
            valor={publico}
            onChange={setPublico}
            opcoes={[
              { value: '', label: 'Todos os públicos' },
              { value: 'INTERNO', label: 'Interno' },
              { value: 'EXTERNO', label: 'Clientes e transportadoras' },
            ]}
          />
        </div>
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, seção ou sistema"
            aria-label="Buscar documentos"
            className="h-11 w-full rounded-lg border border-ink-200 bg-ink-50 pl-11 pr-3.5 text-[14.5px] text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50"
          />
        </label>

        {/* O Selecao traz mt-1.5 embutido (feito para ficar sob um rótulo); aqui
            ele fica em linha com a busca, então compensamos. */}
        <div className="-mt-1.5 md:w-56">
          <Selecao valor={sistema} onChange={setSistema} opcoes={opcoesSistema} placeholder="Todos os sistemas" />
        </div>

        <div role="group" aria-label="Filtrar por status" className="flex min-h-12 md:h-11 shrink-0 rounded-lg bg-ink-100 p-1 dark:bg-ink-900">
          {(
            [
              ['todos', 'Todos'],
              ['publicados', 'Publicados'],
              ['rascunhos', 'Rascunhos'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setStatus(valor)}
              aria-pressed={status === valor}
              className={cn(
                'flex-1 rounded-md px-2.5 md:px-3.5 text-[13px] md:text-[13.5px] font-medium transition',
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
        <p
          role="alert"
          className="mx-4 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13.5px] text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"
        >
          {erro}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="mobile-document-table w-full text-left">
          <thead>
            <tr className="border-b border-ink-200 text-[12.5px] font-semibold uppercase tracking-wide text-ink-500 dark:border-ink-800 dark:text-ink-400">
              <th scope="col" className="px-5 py-3 font-semibold">Documento</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Sistema</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Tipo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              <th scope="col" className="hidden px-4 py-3 text-right font-semibold md:table-cell">Leituras</th>
              <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Atualizado</th>
              <th scope="col" className="px-5 py-3 text-right font-semibold">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-ink-200 dark:divide-ink-800">
            {filtrados.map((doc) => {
              const { rotulo: rotuloTipo, Icone } = TIPO[doc.tipo]
              const bloqueado = ocupado === doc.id
              return (
                <tr key={doc.id} className="group transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60">
                  <td className="document-title px-5 py-4">
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300">
                        <Icone className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`${destinoEdicao}/${doc.id}`}
                          className="block truncate text-[15px] font-medium text-ink-900 hover:text-brand-600 dark:text-ink-50 dark:hover:text-brand-400"
                        >
                          {doc.titulo}
                        </Link>
                        <p className="mt-0.5 truncate text-[13px] text-ink-500 dark:text-ink-400">
                          <span className="md:hidden">{doc.sistemaNome} · </span>
                          {doc.categoriaNome ?? 'Geral'} · {doc.publico === 'EXTERNO' ? 'Clientes e transportadoras' : 'Interno'}
                        </p>
                        <p className="mt-1 text-[12px] text-ink-500 dark:text-ink-400">Criado por {doc.autorNome} · {doc.criadoEm}</p>
                      </div>
                    </div>
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-4 text-[14px] text-ink-700 dark:text-ink-300 md:table-cell">
                    {doc.sistemaNome}
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-4 text-[14px] text-ink-600 dark:text-ink-400 lg:table-cell">
                    {rotuloTipo}
                  </td>

                  <td className="document-status whitespace-nowrap px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium',
                        doc.ativo
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/25 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/25 dark:text-amber-300'
                      )}
                    >
                      <span className={cn('size-1.5 rounded-full', doc.ativo ? 'bg-emerald-500' : 'bg-amber-500')} />
                      {doc.ativo ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-4 text-right text-[14px] tabular-nums text-ink-700 dark:text-ink-300 md:table-cell">
                    {doc.visualizacoes.toLocaleString('pt-BR')}
                  </td>

                  <td className="hidden whitespace-nowrap px-4 py-4 text-[14px] text-ink-600 dark:text-ink-400 lg:table-cell">
                    {doc.atualizadoEm}
                  </td>

                  <td className="document-actions whitespace-nowrap px-5 py-4">
                    <div className="flex items-center justify-end gap-0.5">
                      <Link
                        href={`${destinoEdicao}/${doc.id}`}
                        className="mr-1.5 inline-flex h-11 md:h-9 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-[13.5px] font-medium text-ink-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
                      >
                        <Pencil className="size-4" aria-hidden />
                        Editar
                      </Link>
                      <Link
                        href={`/documentacao/${doc.sistemaSlug}/${doc.slug}`}
                        title="Ver como o colaborador vê"
                        aria-label="Ver como o colaborador vê"
                        className="grid size-11 md:size-9 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-700/60 dark:hover:text-ink-50"
                      >
                        <ExternalLink className="size-[18px]" aria-hidden />
                      </Link>
                      {administrador && <><BotaoIcone
                        rotulo={doc.ativo ? 'Despublicar' : 'Publicar'}
                        onClick={() => alternarPublicacao(doc)}
                        disabled={bloqueado}
                      >
                        {doc.ativo ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
                      </BotaoIcone>
                      <BotaoIcone rotulo="Excluir" perigo onClick={() => { setErroModal(null); setDocumentoExcluir(doc) }} disabled={bloqueado}>
                        <Trash2 className="size-[18px]" aria-hidden />
                      </BotaoIcone></>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <p className="px-6 py-12 text-center text-[14.5px] text-ink-500 dark:text-ink-400">
          {sistema && !busca.trim() && status === 'todos' ? 'Este sistema ainda não tem documentos cadastrados.' : 'Nenhum documento com esses filtros.'}{' '}
          <button
            type="button"
            onClick={() => {
              setBusca('')
              setSistema('')
              setPublico('')
              setStatus('todos')
            }}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Limpar filtros
          </button>
        </p>
      )}

      <div className="border-t border-ink-200 px-5 py-3 text-[13px] text-ink-500 dark:border-ink-800 dark:text-ink-400">
        {filtrando
          ? `Mostrando ${filtrados.length} de ${documentos.length} documentos`
          : `${documentos.length} ${documentos.length === 1 ? 'documento' : 'documentos'}`}
      </div>

      {documentoExcluir && createPortal(
        <div className={FUNDO_MODAL_CONFIRMACAO}>
          <div
            data-modal-documento
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-documento"
            aria-describedby="descricao-modal-documento"
            className="mobile-modal w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl dark:border-ink-700 dark:bg-ink-800"
          >
            <h2 id="titulo-modal-documento" className="text-lg font-semibold text-ink-900 dark:text-white">Excluir documento?</h2>
            <p id="descricao-modal-documento" className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
              Excluir <strong>{documentoExcluir.titulo}</strong>? O arquivo e as imagens deste documento também serão apagados. Esta ação não pode ser desfeita.
            </p>
            {erroModal && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{erroModal}</p>}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button ref={botaoCancelarRef} type="button" disabled={Boolean(ocupado)} onClick={() => setDocumentoExcluir(null)} className="min-h-11 rounded-xl border border-ink-200 px-5 text-sm font-medium text-ink-700 disabled:opacity-50 dark:border-ink-700 dark:text-ink-200">
                Cancelar
              </button>
              <button type="button" disabled={Boolean(ocupado)} onClick={excluir} className="min-h-11 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                {ocupado ? 'Aguarde…' : 'Excluir documento'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
