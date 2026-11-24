'use client'

import type { RefObject } from 'react'
import { ArrowUp } from 'lucide-react'
import { ConsumoAssistenteUsuario } from '@/components/portal/ConsumoAssistenteUsuario'

export function EntradaAssistente({ id, valor, aoAlterar, aoEnviar, enviando, placeholder, referencia, compacto = false }: {
  id: string
  valor: string
  aoAlterar: (valor: string) => void
  aoEnviar: () => void
  enviando: boolean
  placeholder: string
  referencia?: RefObject<HTMLTextAreaElement>
  compacto?: boolean
}) {
  return <div className={`rounded-[22px] border border-ink-200 bg-ink-50 px-3 shadow-sm transition-colors focus-within:border-brand-400 dark:border-ink-600 dark:bg-ink-900 sm:px-4 ${compacto ? 'py-2' : 'py-3'}`}>
    <label htmlFor={id} className="sr-only">Sua pergunta sobre os sistemas</label>
    <textarea ref={referencia} id={id} value={valor} onChange={(evento) => aoAlterar(evento.target.value)} onKeyDown={(evento) => { if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) { evento.preventDefault(); aoEnviar() } }} maxLength={500} rows={compacto ? 1 : 2} placeholder={placeholder} className={`block max-h-32 w-full resize-none bg-transparent px-1 py-1 text-base text-ink-900 placeholder:text-ink-500 focus:outline-none dark:text-ink-50 dark:placeholder:text-ink-400 ${compacto ? 'min-h-8' : 'min-h-12'}`} />
    <div className={`${compacto ? 'mt-1' : 'mt-2'} flex items-end justify-between gap-3`}>
      <ConsumoAssistenteUsuario />
      <button type="submit" disabled={enviando || valor.trim().length < 5} aria-label="Enviar pergunta" className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 disabled:cursor-not-allowed disabled:opacity-40"><ArrowUp size={19} strokeWidth={2.5} aria-hidden="true" /></button>
    </div>
  </div>
}
