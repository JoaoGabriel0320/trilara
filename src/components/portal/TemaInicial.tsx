'use client'

import { useLayoutEffect } from 'react'

export function TemaInicial() {
  useLayoutEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark')
    } catch {
      // Sem armazenamento disponível, mantém o tema padrão.
    }
  }, [])

  return null
}
