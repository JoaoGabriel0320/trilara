'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Selecao } from '@/components/ui/Selecao'
import { useConfirmacao } from '@/components/ui/useConfirmacao'
import { ROTULO_STATUS, ORDEM_STATUS, type StatusIdeia } from '@/lib/ideias'

export function PainelGestaoIdeia({
  ideiaId,
  titulo,
  status,
  podeMudarStatus,
  podeEditarOuExcluir,
}: {
  ideiaId: string
  titulo: string
  status: StatusIdeia
  podeMudarStatus: boolean
  podeEditarOuExcluir: boolean
}) {
  const router = useRouter()
  const [statusAtual, setStatusAtual] = useState(status)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const { confirmar, modal } = useConfirmacao()

  async function mudarStatus(novo: string) {
    setOcupado(true)
    setErro(null)
    const anterior = statusAtual
    setStatusAtual(novo as StatusIdeia)
    const res = await fetch(`/api/lab/${ideiaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    })
    if (!res.ok) {
      setStatusAtual(anterior)
      const dados = await res.json().catch(() => ({}))
      setErro(dados.error ?? 'Não foi possível mudar o status.')
    } else {
      router.refresh()
    }
    setOcupado(false)
  }

  async function excluir() {
    if (!await confirmar({ titulo: 'Excluir ideia?', mensagem: `Excluir a ideia "${titulo}"? Esta ação não pode ser desfeita.`, acao: 'Excluir ideia', perigo: true })) return
    setOcupado(true)
    const res = await fetch(`/api/lab/${ideiaId}`, { method: 'DELETE' })
    if (!res.ok) {
      const dados = await res.json().catch(() => ({}))
      setErro(dados.error ?? 'Não foi possível excluir.')
      setOcupado(false)
      return
    }
    router.push('/lab')
    router.refresh()
  }

  if (!podeMudarStatus && !podeEditarOuExcluir) return null

  return (
    <div className="mt-8 rounded-xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-900/60">
      {modal}
      <p className="rotulo mb-3 text-ink-400">Gestão</p>

      <div className="flex flex-wrap items-end gap-3">
        {podeMudarStatus && (
          <div className="w-full max-w-[220px]">
            <span className="text-[12.5px] font-medium text-ink-600 dark:text-ink-400">Status</span>
            <Selecao
              valor={statusAtual}
              onChange={mudarStatus}
              disabled={ocupado}
              opcoes={ORDEM_STATUS.map((s) => ({ value: s, label: ROTULO_STATUS[s] }))}
            />
          </div>
        )}

        {podeEditarOuExcluir && (
          <div className="flex items-center gap-3 pb-0.5">
            <Link
              href={`/lab/${ideiaId}/editar`}
              className="text-[13.5px] font-medium text-ink-600 hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
            >
              Editar
            </Link>
            <button
              onClick={excluir}
              disabled={ocupado}
              className="text-[13.5px] font-medium text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400"
            >
              Excluir
            </button>
          </div>
        )}
      </div>

      {erro && <p className="mt-3 text-[13px] text-rose-600 dark:text-rose-400">{erro}</p>}
    </div>
  )
}
