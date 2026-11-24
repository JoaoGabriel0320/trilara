'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ListOrdered } from 'lucide-react'
import { cn } from '@/lib/utils'

type FiltroStatus = 'todos' | 'abertos' | 'resolvidos'

type Relato = {
  id: string
  tituloDocumento: string
  sistemaSlug: string
  autorNome: string
  mensagem: string
  status: 'ABERTO' | 'RESOLVIDO'
  criadoEm: string
  resolvidoPor: string | null
  documentoUrl: string | null
  passo: { numero: number; titulo: string | null } | null
}

export function FilaRelatos({ relatos }: { relatos: Relato[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<FiltroStatus>('todos')
  const filtrados = relatos.filter((relato) =>
    filtro === 'todos' || relato.status === (filtro === 'abertos' ? 'ABERTO' : 'RESOLVIDO')
  )

  async function alterarStatus(relato: Relato) {
    setOcupado(relato.id)
    setErro(null)
    try {
      const resposta = await fetch(`/api/admin/relatos/${encodeURIComponent(relato.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: relato.status === 'ABERTO' ? 'RESOLVIDO' : 'ABERTO' }),
      })
      const dados = await resposta.json().catch(() => ({}))
      if (!resposta.ok) throw new Error(dados.error ?? 'Não foi possível atualizar o relato.')
      router.refresh()
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível atualizar o relato.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filtrar relatos por status" className="inline-flex min-h-11 max-w-full rounded-lg bg-ink-100 p-1 dark:bg-ink-800">
        {([
          ['todos', 'Todos'],
          ['abertos', 'Abertos'],
          ['resolvidos', 'Resolvidos'],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setFiltro(valor)}
            aria-pressed={filtro === valor}
            className={cn(
              'min-h-9 rounded-md px-3.5 text-[13px] font-medium transition',
              filtro === valor
                ? 'bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-ink-50'
                : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200'
            )}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {erro && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{erro}</p>}
      {filtrados.length === 0 && <p className="rounded-xl border border-dashed border-ink-200 p-8 text-sm text-ink-500 dark:border-ink-800">{filtro === 'todos' ? 'Nenhum relato recebido.' : filtro === 'abertos' ? 'Nenhum relato aberto.' : 'Nenhum relato resolvido.'}</p>}
      {filtrados.map((relato) => (
        <article key={relato.id} className="[overflow-wrap:anywhere] rounded-2xl border border-ink-200 bg-white p-4 sm:p-5 dark:border-ink-800 dark:bg-ink-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink-900 dark:text-ink-50">{relato.tituloDocumento}</h2>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${relato.status === 'ABERTO' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>{relato.status === 'ABERTO' ? 'Aberto' : 'Resolvido'}</span>
              </div>
              <p className="mt-1 text-[12px] text-ink-500 dark:text-ink-400">{relato.sistemaSlug} · {relato.autorNome} · {relato.criadoEm}</p>
              {relato.passo && <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><ListOrdered size={14} aria-hidden="true" /> Passo {relato.passo.numero} · {relato.passo.titulo ?? 'Título não informado'}</p>}
            </div>
            {relato.documentoUrl && <Link href={relato.documentoUrl} target="_blank" className="inline-flex min-h-11 items-center text-[13px] font-medium text-brand-600 hover:underline dark:text-brand-400">{relato.passo ? 'Abrir no passo' : 'Abrir documento'}</Link>}
          </div>
          <p className="mt-4 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-700 dark:text-ink-200">{relato.mensagem}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-200 pt-4 dark:border-ink-700">
            <button type="button" disabled={ocupado === relato.id} onClick={() => alterarStatus(relato)} className="min-h-11 rounded-xl border border-ink-200 px-4 text-[13px] font-medium text-brand-600 disabled:opacity-50 dark:border-ink-700 dark:text-brand-400">{ocupado === relato.id ? 'Aguarde…' : relato.status === 'ABERTO' ? 'Marcar como resolvido' : 'Reabrir relato'}</button>
            {relato.resolvidoPor && <span className="text-[12px] text-ink-400">Resolvido por {relato.resolvidoPor}</span>}
          </div>
        </article>
      ))}
    </div>
  )
}
