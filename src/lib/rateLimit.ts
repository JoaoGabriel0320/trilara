// src/lib/rateLimit.ts
//
// Limites por processo. Em instalações com múltiplas instâncias, usar um
// armazenamento compartilhado e manter o limite adicional no proxy reverso.

import { isIP } from 'node:net'

type Registro = { tentativas: number; primeiraEm: number }

const JANELA_MS = 15 * 60 * 1000 // 15 minutos
const MAX_TENTATIVAS = 5
const MAX_REGISTROS = 20_000
const INTERVALO_LIMPEZA_MS = 60_000
let ultimaLimpezaEm = 0

const registros = new Map<string, Registro>()

const DURACOES_LOGIN_MS = [60_000, 5 * 60_000, 60 * 60_000, 24 * 60 * 60_000] as const
const LIMPAR_ESCALADA_APOS_MS = 24 * 60 * 60_000
type RegistroLogin = { tentativas: number; nivel: number; bloqueadoAte: number; ultimaTentativaEm: number }
const registrosLogin = new Map<string, RegistroLogin>()

function limpar(agora: number): void {
  if (agora - ultimaLimpezaEm < INTERVALO_LIMPEZA_MS) return
  ultimaLimpezaEm = agora
  for (const [chave, reg] of registros) {
    if (agora - reg.primeiraEm > JANELA_MS) registros.delete(chave)
  }
  for (const [chave, reg] of registrosLogin) {
    if (agora >= reg.bloqueadoAte && agora - reg.ultimaTentativaEm >= LIMPAR_ESCALADA_APOS_MS) {
      registrosLogin.delete(chave)
    }
  }
}

function registroLogin(chave: string, agora: number): RegistroLogin | null {
  limpar(agora)
  let reg = registrosLogin.get(chave)
  if (!reg || (agora >= reg.bloqueadoAte && agora - reg.ultimaTentativaEm >= LIMPAR_ESCALADA_APOS_MS)) {
    if (!reg && registrosLogin.size >= MAX_REGISTROS) return null
    reg = { tentativas: 0, nivel: 0, bloqueadoAte: 0, ultimaTentativaEm: agora }
    registrosLogin.set(chave, reg)
  }
  return reg
}

export function bloqueioLogin(chave: string): { bloqueado: boolean; esperarSegundos: number } {
  const agora = Date.now()
  limpar(agora)
  const reg = registrosLogin.get(chave)
  if (!reg && registrosLogin.size >= MAX_REGISTROS) return { bloqueado: true, esperarSegundos: 60 }
  if (!reg || agora >= reg.bloqueadoAte) return { bloqueado: false, esperarSegundos: 0 }
  return { bloqueado: true, esperarSegundos: Math.ceil((reg.bloqueadoAte - agora) / 1000) }
}

function consumirTentativaLogin(chave: string, limite: number): boolean {
  const agora = Date.now()
  const reg = registroLogin(chave, agora)
  if (!reg) return false
  reg.tentativas++
  reg.ultimaTentativaEm = agora
  if (reg.tentativas >= limite) {
    reg.tentativas = 0
    reg.bloqueadoAte = agora + DURACOES_LOGIN_MS[reg.nivel]
    reg.nivel = Math.min(reg.nivel + 1, DURACOES_LOGIN_MS.length - 1)
  }
  return true
}

/** Reserva a tentativa antes da consulta ao banco. */
export function iniciarTentativaLogin(chave: string, limite = 5): { bloqueado: boolean; esperarSegundos: number } {
  const trava = bloqueioLogin(chave)
  if (trava.bloqueado) return trava
  if (!consumirTentativaLogin(chave, limite)) return { bloqueado: true, esperarSegundos: 60 }
  return { bloqueado: false, esperarSegundos: 0 }
}

/** Usado no limite por IP, que só deve contar falhas. */
export function registrarFalhaLogin(chave: string, limite = 5): void {
  if (!bloqueioLogin(chave).bloqueado) consumirTentativaLogin(chave, limite)
}

export function limparTentativasLogin(chave: string): void {
  registrosLogin.delete(chave)
}

export function estaBloqueado(chave: string, maxTentativas = MAX_TENTATIVAS): { bloqueado: boolean; esperarSegundos: number } {
  const agora = Date.now()
  limpar(agora)

  const reg = registros.get(chave)
  if (!reg && registros.size >= MAX_REGISTROS) return { bloqueado: true, esperarSegundos: 60 }
  if (!reg) return { bloqueado: false, esperarSegundos: 0 }

  if (agora - reg.primeiraEm > JANELA_MS) {
    registros.delete(chave)
    return { bloqueado: false, esperarSegundos: 0 }
  }

  if (reg.tentativas >= maxTentativas) {
    return {
      bloqueado: true,
      esperarSegundos: Math.ceil((JANELA_MS - (agora - reg.primeiraEm)) / 1000),
    }
  }

  return { bloqueado: false, esperarSegundos: 0 }
}

export function registrarFalha(chave: string) {
  const agora = Date.now()
  limpar(agora)
  const reg = registros.get(chave)

  if (!reg || agora - reg.primeiraEm > JANELA_MS) {
    if (!reg && registros.size >= MAX_REGISTROS) return
    registros.set(chave, { tentativas: 1, primeiraEm: agora })
    return
  }

  reg.tentativas += 1
}

export function limparTentativas(chave: string) {
  registros.delete(chave)
}

/** O IP só é confiável quando um proxy privado sobrescreve X-Real-IP. */
export function chaveDaRequisicao(req: Request, email?: string) {
  const informado = process.env.RATE_LIMIT_TRUST_PROXY === 'true' ? req.headers.get('x-real-ip')?.trim() : null
  const ip = informado && isIP(informado) ? informado : 'sem-proxy-confiavel'
  return `${ip}:${(email ?? '').toLowerCase()}`
}
