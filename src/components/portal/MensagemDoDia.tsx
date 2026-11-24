'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { mensagemDoDia } from '@/lib/mensagem-do-dia'

const formatoData = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Sao_Paulo',
})

export function MensagemDoDia({ deslocamento, inicial, dataInicial }: { deslocamento: number; inicial: string; dataInicial: string }) {
  const [mensagem, setMensagem] = useState(inicial)
  const [data, setData] = useState(dataInicial)

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>

    function atualizar() {
      clearTimeout(temporizador)
      const agora = new Date()
      setMensagem(mensagemDoDia(deslocamento, agora))
      const dataFormatada = formatoData.format(agora)
      setData(dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1))
      // Confere na virada de cada minuto para trocar também com a página aberta.
      temporizador = setTimeout(atualizar, 60_000 - (Date.now() % 60_000) + 100)
    }

    atualizar()
    window.addEventListener('focus', atualizar)
    return () => {
      clearTimeout(temporizador)
      window.removeEventListener('focus', atualizar)
    }
  }, [deslocamento])

  return (
    <div className="w-full max-w-md rounded-xl border border-slate-200 border-l-[3px] border-l-brand-500 bg-white px-4 py-3 text-left shadow-sm dark:border-slate-700 dark:border-l-brand-400 dark:bg-ink-800 sm:w-auto sm:text-right">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Inspiração do dia</p>
      <p className="mt-1.5 text-[15px] font-medium leading-6 text-slate-800 dark:text-slate-100">{mensagem}</p>
      <p className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-2 text-[12px] text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:justify-end">
        <CalendarDays size={14} aria-hidden="true" />
        {data}
      </p>
    </div>
  )
}
