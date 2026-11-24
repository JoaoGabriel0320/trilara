'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'

export function CopiarLinkPasso({ numero }: { numero: number }) {
  const [mensagem, setMensagem] = useState('')

  async function copiar() {
    const url = `${location.origin}${location.pathname}#passo-${numero}`
    let copiou = false
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        copiou = true
      }
    } catch {
      // O caminho abaixo também funciona por IP sem HTTPS.
    }
    if (!copiou) {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      try { copiou = document.execCommand('copy') } catch { copiou = false }
      textarea.remove()
    }
    setMensagem(copiou ? 'Link do passo copiado.' : `Não foi possível copiar. Link: ${url}`)
    window.setTimeout(() => setMensagem(''), 2500)
  }

  return <div className="text-right">
    <button type="button" onClick={copiar} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-[12px] font-semibold text-ink-500 hover:text-brand-700 dark:text-ink-400 dark:hover:text-brand-300"><Link2 size={15} aria-hidden="true" /> Copiar link do passo</button>
    <p role="status" className="sr-only">{mensagem}</p>
  </div>
}
