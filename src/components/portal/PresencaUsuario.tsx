'use client'

import { useEffect } from 'react'
import { INTERVALO_PRESENCA_MS } from '@/lib/presenca'

export function PresencaUsuario() {
  useEffect(() => {
    let pendente = false
    let verificando = false
    let redirecionando = false
    let eventosConectados = false

    function redirecionar(motivo: 'novo-login' | 'sessao-expirada') {
      if (redirecionando) return
      redirecionando = true
      window.location.replace(motivo === 'novo-login' ? '/login?motivo=novo-login' : '/login?motivo=sessao-expirada')
    }

    async function tratarSessao(resposta: Response) {
      if (resposta.status !== 401 || redirecionando) return
      const dados = await resposta.json().catch(() => ({}))
      redirecionar(dados.codigo === 'NOVO_LOGIN' ? 'novo-login' : 'sessao-expirada')
    }

    async function verificarSessao() {
      if (document.visibilityState !== 'visible' || eventosConectados || verificando || redirecionando) return
      verificando = true
      try {
        const resposta = await fetch('/api/presenca', { cache: 'no-store' })
        await tratarSessao(resposta)
      } catch {
        // Falha de rede não encerra a sessão; a próxima verificação tenta de novo.
      } finally {
        verificando = false
      }
    }

    async function registrarPresenca() {
      if (document.visibilityState !== 'visible' || pendente || redirecionando) return
      pendente = true
      try {
        const resposta = await fetch('/api/presenca', { method: 'POST', cache: 'no-store' })
        await tratarSessao(resposta)
      } catch {
        // A próxima tentativa ocorre no intervalo ou quando a aba voltar ao foco.
      } finally {
        pendente = false
      }
    }

    const eventos = new EventSource('/api/sessao/eventos')
    eventos.onopen = () => { eventosConectados = true }
    eventos.onerror = () => { eventosConectados = false }
    eventos.addEventListener('novo-login', () => redirecionar('novo-login'))
    eventos.addEventListener('sessao-expirada', () => redirecionar('sessao-expirada'))

    void registrarPresenca()
    const verificacao = window.setInterval(() => void verificarSessao(), 15_000)
    const intervalo = window.setInterval(() => void registrarPresenca(), INTERVALO_PRESENCA_MS)
    document.addEventListener('visibilitychange', registrarPresenca)
    document.addEventListener('visibilitychange', verificarSessao)
    window.addEventListener('focus', registrarPresenca)
    window.addEventListener('focus', verificarSessao)

    return () => {
      eventos.close()
      window.clearInterval(verificacao)
      window.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', registrarPresenca)
      document.removeEventListener('visibilitychange', verificarSessao)
      window.removeEventListener('focus', registrarPresenca)
      window.removeEventListener('focus', verificarSessao)
    }
  }, [])

  return null
}
