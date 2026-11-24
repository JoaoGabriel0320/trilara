'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Selecao, type OpcaoSelecao } from '@/components/ui/Selecao'

export function FiltroHistoricoDocumentos({ acaoInicial, usuarioInicial, opcoes }: { acaoInicial: string; usuarioInicial: string; opcoes: OpcaoSelecao[] }) {
  const router = useRouter()
  const [acao, setAcao] = useState(acaoInicial)
  const [usuario, setUsuario] = useState(usuarioInicial)
  const campoUsuario = useRef<HTMLInputElement>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setAcao(acaoInicial), [acaoInicial])
  useEffect(() => {
    // Mantém o texto que a pessoa ainda está digitando se uma busca anterior terminar depois.
    if (document.activeElement !== campoUsuario.current) setUsuario(usuarioInicial)
  }, [usuarioInicial])
  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current)
  }, [])

  function navegar(proximoUsuario: string, proximaAcao: string) {
    const parametros = new URLSearchParams()
    if (proximoUsuario.trim()) parametros.set('usuario', proximoUsuario.trim())
    if (proximaAcao) parametros.set('acao', proximaAcao)
    router.replace(`/admin/logs${parametros.size ? `?${parametros}` : ''}`, { scroll: false })
  }

  function alterarUsuario(valor: string) {
    setUsuario(valor)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => {
      temporizador.current = null
      navegar(valor, acao)
    }, 350)
  }

  function alterarAcao(valor: string) {
    setAcao(valor)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = null
    navegar(usuario, valor)
  }

  return (
    <div className="my-6 flex flex-wrap items-end gap-3">
      <label className="w-full text-sm font-medium text-ink-700 dark:text-ink-200 sm:w-80">
        Buscar por usuário
        <input
          ref={campoUsuario}
          type="search"
          value={usuario}
          onChange={(evento) => alterarUsuario(evento.target.value)}
          placeholder="Nome ou e-mail do responsável"
          maxLength={100}
          className="mt-1.5 min-h-11 w-full rounded-xl border border-ink-200 bg-ink-50 px-3.5 text-sm font-normal text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50"
        />
      </label>
      <div className="w-full sm:w-64">
        <p id="rotulo-filtro-acao" className="text-sm font-medium text-ink-700 dark:text-ink-200">Ação</p>
        <Selecao rotuloId="rotulo-filtro-acao" valor={acao} onChange={alterarAcao} opcoes={opcoes} />
      </div>
    </div>
  )
}
