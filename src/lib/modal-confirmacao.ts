import { useEffect } from 'react'

export const FUNDO_MODAL_CONFIRMACAO = 'fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/80 p-4'

let modaisAbertos = 0
let estilosAnteriores: { html: string; body: string; paddingRight: string } | null = null

export function useBloqueioRolagemConfirmacao(aberto: boolean) {
  useEffect(() => {
    if (!aberto) return

    if (modaisAbertos === 0) {
      const html = document.documentElement
      const body = document.body
      const larguraBarra = window.innerWidth - html.clientWidth
      estilosAnteriores = { html: html.style.overflow, body: body.style.overflow, paddingRight: body.style.paddingRight }
      if (larguraBarra > 0) {
        body.style.paddingRight = `${(Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0) + larguraBarra}px`
      }
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
    }
    modaisAbertos += 1

    return () => {
      modaisAbertos -= 1
      if (modaisAbertos === 0 && estilosAnteriores) {
        document.documentElement.style.overflow = estilosAnteriores.html
        document.body.style.overflow = estilosAnteriores.body
        document.body.style.paddingRight = estilosAnteriores.paddingRight
        estilosAnteriores = null
      }
    }
  }, [aberto])
}
