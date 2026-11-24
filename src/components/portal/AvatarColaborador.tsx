'use client'

import { useState } from 'react'

export function AvatarColaborador({ nome, fotoKey, urlFoto = '/api/conta/foto', className = '' }: {
  nome: string
  fotoKey: string | null
  urlFoto?: string
  className?: string
}) {
  const [chaveComErro, setChaveComErro] = useState<string | null>(null)
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join('')

  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center overflow-hidden bg-slate-700 font-semibold text-white dark:bg-slate-600 ${className}`}>
      {fotoKey && chaveComErro !== fotoKey ? (
        // A foto é privada e a rota usa o cookie de sessão do navegador.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${urlFoto}?v=${encodeURIComponent(fotoKey)}`} alt="" onError={() => setChaveComErro(fotoKey)} className="h-full w-full object-cover" />
      ) : iniciais}
    </span>
  )
}
