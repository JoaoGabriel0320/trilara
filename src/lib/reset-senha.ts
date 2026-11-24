import { createHash, randomBytes } from 'node:crypto'

export const DURACAO_RESET_MS = 30 * 60 * 1000

export function gerarTokenReset() {
  const token = randomBytes(32).toString('hex')
  return { token, hash: hashTokenReset(token) }
}

export function hashTokenReset(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function tokenResetValido(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token)
}
