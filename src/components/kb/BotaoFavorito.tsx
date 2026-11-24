'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'

export function BotaoFavorito({ documentoId, inicial, compacto = false }: {
  documentoId: string
  inicial: boolean
  compacto?: boolean
}) {
  const router = useRouter()
  const [favorito, setFavorito] = useState(inicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => { setFavorito(inicial) }, [inicial])

  async function alternar() {
    if (salvando) return
    setSalvando(true)
    setErro('')
    try {
      const resposta = await fetch(`/api/documentos/${encodeURIComponent(documentoId)}/favorito`, {
        method: favorito ? 'DELETE' : 'POST',
      })
      if (!resposta.ok) throw new Error()
      setFavorito(!favorito)
      router.refresh()
    } catch {
      setErro('Não foi possível atualizar o favorito. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return <div className={compacto ? 'flex shrink-0 flex-col items-end' : 'flex flex-col items-start'}>
    <button
      type="button"
      onClick={alternar}
      disabled={salvando}
      aria-pressed={favorito}
      aria-label={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-[13px] font-medium transition disabled:opacity-60 ${favorito ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300' : 'border-ink-200 bg-white text-ink-500 hover:border-brand-300 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300'}`}
    >
      <Star size={18} fill={favorito ? 'currentColor' : 'none'} aria-hidden="true" />
      {!compacto && (favorito ? 'Salvo nos favoritos' : 'Favoritar')}
    </button>
    {erro && <span role="alert" className="mt-1 max-w-44 text-right text-xs text-rose-600">{erro}</span>}
  </div>
}
