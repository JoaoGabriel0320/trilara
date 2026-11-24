import { createHmac, timingSafeEqual } from 'node:crypto'

// Vincula a sessão ao hash atual da senha sem expor esse hash no JWT.
export function marcaCredencial(senhaHash: string): string {
  const segredo = process.env.SESSION_SECRET
  if (!segredo) throw new Error('SESSION_SECRET não está definido.')
  return createHmac('sha256', segredo).update(senhaHash).digest('hex')
}

export function credencialConfere(marca: string, senhaHash: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(marca)) return false
  return timingSafeEqual(Buffer.from(marca, 'hex'), Buffer.from(marcaCredencial(senhaHash), 'hex'))
}
