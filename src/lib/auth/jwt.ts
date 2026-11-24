// src/lib/auth/jwt.ts
//
// Assinatura/verificação do token de sessão. Este módulo é o único que o
// middleware importa: ele roda no Edge Runtime, onde APIs de Node (fs, crypto
// nativo, next/headers) não existem. `jose` é WebCrypto puro e funciona lá.
// Tudo que depende de Node fica em session.ts.

import { SignJWT, jwtVerify } from 'jose'
import { podeCriarDocumento } from './permissoes'

export const COOKIE_SESSAO = 'colaborador_token'
export const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8 // 8h

export type Papel = 'COLABORADOR' | 'EDITOR' | 'ADMIN'

export type SessaoPayload = {
  id: string
  sessaoId: string
  email: string
  nome: string
  papel: Papel
  tipoAcesso?: 'INTERNO' | 'EXTERNO'
  credencial: string
  // Senha temporária (gerada na criação ou num reset do admin): o proxy usa
  // este campo pra travar o colaborador em /definir-senha até ele trocar.
  mustChangePassword: boolean
}

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET não está definido no .env — o login não funciona sem ele.')
  }
  return new TextEncoder().encode(secret)
}

export async function assinarToken(payload: SessaoPayload, expiraEm = '8h'): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiraEm)
    .sign(getSecret())
}

export async function verificarToken(token: string): Promise<SessaoPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload || typeof payload.id !== 'string' || typeof payload.sessaoId !== 'string' || typeof payload.credencial !== 'string') return null
    return payload as unknown as SessaoPayload
  } catch {
    // token expirado, assinatura inválida ou secret trocado — tratamos como "sem sessão"
    return null
  }
}

export function podePublicar(papel: Papel) {
  return podeCriarDocumento(papel)
}

export function souAdmin(papel: Papel) {
  return papel === 'ADMIN'
}
