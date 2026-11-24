'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'

export function BotaoImprimirGuia() {
  useEffect(() => {
    const elementos = [document.documentElement, document.body]
    const anteriores = elementos.map((elemento) => ({
      valor: elemento.style.getPropertyValue('background-color'),
      prioridade: elemento.style.getPropertyPriority('background-color'),
    }))
    document.documentElement.classList.add('guia-impressao-ativa')
    document.body.classList.add('guia-impressao-ativa')
    // A raiz do portal cobre estes ancestrais na tela. Mantê-los brancos só
    // enquanto o guia está montado garante impressão legível inclusive em
    // mecanismos que ignoram o background de body dentro de @media print.
    elementos.forEach((elemento) => elemento.style.setProperty('background-color', '#fff', 'important'))
    return () => {
      document.documentElement.classList.remove('guia-impressao-ativa')
      document.body.classList.remove('guia-impressao-ativa')
      elementos.forEach((elemento, indice) => {
        const anterior = anteriores[indice]
        if (anterior.valor) elemento.style.setProperty('background-color', anterior.valor, anterior.prioridade)
        else elemento.style.removeProperty('background-color')
      })
    }
  }, [])

  return <button type="button" onClick={() => window.print()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 px-4 py-3 text-[14px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300 dark:hover:text-brand-400"><Printer size={17} aria-hidden="true" /> Imprimir</button>
}
