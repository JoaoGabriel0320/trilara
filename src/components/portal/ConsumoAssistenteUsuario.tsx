'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { ChartNoAxesColumn, ChevronDown } from 'lucide-react'
import type { ConsumoDiarioAssistente } from '@/lib/assistente-limite'

const numero = new Intl.NumberFormat('pt-BR')
const dataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
})

export function ConsumoAssistenteUsuario({ escuro = false, abaixo = false }: { escuro?: boolean; abaixo?: boolean }) {
  const [consumo, setConsumo] = useState<ConsumoDiarioAssistente | null>(null)
  const [aberto, setAberto] = useState(false)
  const painelId = useId()

  const atualizar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/assistente/consumo', { cache: 'no-store' })
      if (resposta.ok) setConsumo(await resposta.json() as ConsumoDiarioAssistente)
    } catch {
      // A falha na leitura do saldo não impede a consulta aos manuais.
    }
  }, [])

  useEffect(() => {
    void atualizar()
    const aoAtualizar = () => void atualizar()
    const aoVoltar = () => { if (document.visibilityState === 'visible') void atualizar() }
    window.addEventListener('assistente:consumo-atualizado', aoAtualizar)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      window.removeEventListener('assistente:consumo-atualizado', aoAtualizar)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [atualizar])

  useEffect(() => {
    if (!consumo) return
    const espera = Math.max(1_000, new Date(consumo.resetEm).getTime() - Date.now() + 1_000)
    const timer = window.setTimeout(() => void atualizar(), espera)
    return () => window.clearTimeout(timer)
  }, [consumo, atualizar])

  const percentualTokens = consumo ? (consumo.limiteTokens > 0 ? Math.min(100, Math.floor(consumo.usadoTokens / consumo.limiteTokens * 100)) : 100) : 0
  const percentualTentativas = consumo ? (consumo.limiteTentativas > 0 ? Math.min(100, Math.floor(consumo.tentativas / consumo.limiteTentativas * 100)) : 100) : 0
  const percentualMaior = Math.max(percentualTokens, percentualTentativas)

  return <div className="relative shrink-0 text-xs" aria-label="Limite diário do assistente">
    <button type="button" aria-expanded={aberto} aria-controls={painelId} onClick={() => setAberto((valor) => !valor)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${escuro ? 'text-ink-200 hover:bg-white/10' : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-700'}`}>
      <ChartNoAxesColumn size={16} aria-hidden="true" />
      <span>Uso da IA</span>
      {consumo && <span className={`tabular-nums ${consumo.bloqueado ? 'text-rose-400' : escuro ? 'text-ink-400' : 'text-ink-500 dark:text-ink-400'}`}>{percentualMaior}%</span>}
      <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
    </button>
    {aberto && <div id={painelId} className={`absolute z-30 w-[min(320px,calc(100vw-48px))] rounded-xl border border-ink-200 bg-white p-4 text-ink-700 shadow-xl dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200 ${abaixo ? 'right-0 top-full mt-2' : 'bottom-full left-0 mb-3'}`}>
      <p className="font-semibold text-ink-900 dark:text-ink-50">Seu limite diário de IA</p>
      {!consumo ? <p className="mt-3 text-ink-500 dark:text-ink-400">Não foi possível carregar o consumo agora.</p> : <>
        <div className="mt-4 flex items-center justify-between gap-2"><span>Tokens hoje</span><span className="tabular-nums">{percentualTokens}% · {numero.format(consumo.usadoTokens)} / {numero.format(consumo.limiteTokens)}</span></div>
        <div role="progressbar" aria-label="Percentual de tokens usados hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentualTokens} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700"><div className={`h-full rounded-full ${percentualTokens === 100 ? 'bg-rose-500' : 'bg-brand-600'}`} style={{ width: `${percentualTokens}%` }} /></div>
        <p className="mt-1 text-ink-500 dark:text-ink-400">{numero.format(consumo.restanteTokens)} tokens restantes</p>
        <div className="mt-4 flex items-center justify-between gap-2"><span>Tentativas de IA</span><span className="tabular-nums">{percentualTentativas}% · {numero.format(consumo.tentativas)} / {numero.format(consumo.limiteTentativas)}</span></div>
        <div role="progressbar" aria-label="Percentual de tentativas usadas hoje" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentualTentativas} className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700"><div className={`h-full rounded-full ${percentualTentativas === 100 ? 'bg-rose-500' : 'bg-brand-600'}`} style={{ width: `${percentualTentativas}%` }} /></div>
        <p className="mt-1 text-ink-500 dark:text-ink-400">{numero.format(consumo.restanteTentativas)} tentativas restantes</p>
        <p className={`mt-4 ${consumo.bloqueado ? 'font-medium text-rose-600 dark:text-rose-300' : ''}`}>{consumo.bloqueado ? 'Limite atingido. ' : ''}Reset: {dataHora.format(new Date(consumo.resetEm))} (São Paulo)</p>
        {consumo.semContagem > 0 && <p className="mt-2 text-ink-500 dark:text-ink-400">{consumo.semContagem} {consumo.semContagem === 1 ? 'tentativa sem contagem' : 'tentativas sem contagem'} de tokens, incluindo possíveis falhas.</p>}
      </>}
    </div>}
  </div>
}
