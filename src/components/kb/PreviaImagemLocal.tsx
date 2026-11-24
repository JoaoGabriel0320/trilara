'use client'

import { useEffect, useState } from 'react'
import { Images } from 'lucide-react'

export function PreviaImagemLocal({ arquivo, className = 'aspect-video w-full' }: { arquivo: File; className?: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const objeto = URL.createObjectURL(arquivo)
    setUrl(objeto)
    return () => URL.revokeObjectURL(objeto)
  }, [arquivo])

  if (!url) return <span className={`grid place-items-center bg-ink-50 text-ink-400 dark:bg-ink-900 ${className}`}><Images size={24} aria-hidden="true" /></span>
  // A URL local pertence ao navegador e só existe enquanto o arquivo está selecionado.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" loading="lazy" decoding="async" className={`bg-ink-50 object-contain dark:bg-ink-900 ${className}`} />
}
